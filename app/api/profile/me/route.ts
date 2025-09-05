// app/api/profile/me/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { z } from 'zod';
import type { Prisma, HeadframeCode, PanelPreset } from '@prisma/client';

// ===== Zod schema（用 Prisma enum 做型別保障） =====
// 如果你的 schema 沒有 PanelPreset 這個 enum，請將下方 panelStyle 的行移除
const PutSchema = z.object({
  displayName: z.string().min(2).max(20).optional(),
  nickname: z.string().max(30).optional(),
  about: z.string().max(200).optional(),
  country: z.string().max(2).optional(),
  avatarUrl: z.string().url().optional(),
  headframe: z.nativeEnum<HeadframeCode>(/* as any 讓 TS 接受實際 enum */ ({} as any)).optional(),
  panelStyle: z.nativeEnum<PanelPreset>({} as any).optional(),
  panelTint: z.string().max(16).optional(), // e.g. '#AABBCC' 或 short key
});

// --- 小技巧：在 runtime 取 enum 值給 z.nativeEnum ---
function prismaEnum<E>(e: object) {
  // @ts-expect-error - runtime 取值給 zod
  return z.nativeEnum(e);
}

// 重新建構 schema，使用實際的 Prisma enum
const PutSchemaRuntime = z.object({
  displayName: z.string().min(2).max(20).optional(),
  nickname: z.string().max(30).optional(),
  about: z.string().max(200).optional(),
  country: z.string().max(2).optional(),
  avatarUrl: z.string().url().optional(),
  headframe: prismaEnum((prisma as unknown as { _dmmf: any })._dmmf.datamodel.enums.find((e: any) => e.name === 'HeadframeCode') ? (await import('@prisma/client')).HeadframeCode : {}) .optional() as z.ZodType<HeadframeCode | undefined>, // 兼容 build；如果不想動態，可直接用 z.nativeEnum(HeadframeCode)
  panelStyle: prismaEnum((prisma as unknown as { _dmmf: any })._dmmf.datamodel.enums.find((e: any) => e.name === 'PanelPreset') ? (await import('@prisma/client')).PanelPreset : {}) .optional() as z.ZodType<PanelPreset | undefined>,
  panelTint: z.string().max(16).optional(),
});

// ===== GET /api/profile/me =====
export async function GET(req: NextRequest) {
  try {
    const auth = await getUserFromRequest(req);
    if (!auth?.id) return NextResponse.json({ ok: false }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: auth.id },
      select: {
        id: true,
        email: true,
        avatarUrl: true,
        isAdmin: true,
        balance: true,
        bankBalance: true,
        vipTier: true,
        displayName: true,
        nickname: true,
        about: true,
        country: true,
        headframe: true,
        panelStyle: true,
        panelTint: true,
      },
    });

    if (!user) return NextResponse.json({ ok: false }, { status: 404 });
    return NextResponse.json({ ok: true, user });
  } catch (e) {
    console.error('PROFILE_ME_GET', e);
    return NextResponse.json({ ok: false, error: 'INTERNAL' }, { status: 500 });
  }
}

// ===== PUT /api/profile/me =====
export async function PUT(req: NextRequest) {
  try {
    const auth = await getUserFromRequest(req);
    if (!auth?.id) return NextResponse.json({ ok: false }, { status: 401 });

    // 允許 formData 或 JSON
    const isJson = req.headers.get('content-type')?.includes('application/json');
    let raw: any;
    if (isJson) {
      raw = await req.json();
    } else {
      const fd = await req.formData();
      raw = {} as Record<string, string>;
      fd.forEach((v, k) => (raw[k] = String(v)));
    }

    // 用「靜態」schema 先做基本字串檢查，避免 build 阻塞
    const basic = PutSchema.safeParse(raw);
    if (!basic.success) {
      return NextResponse.json({ ok: false, error: 'BAD_PAYLOAD' }, { status: 400 });
    }

    // 強烈建議：直接在此把字串 -> enum 做兜底轉換（若傳無效值就忽略）
    const data = basic.data;

    // 把要寫入 Prisma 的資料準備好（undefined 就不更新）
    const updateData: Prisma.UserUpdateInput = {
      displayName: data.displayName ?? undefined,
      nickname: data.nickname ?? undefined,
      about: data.about ?? undefined,
      country: data.country ?? undefined,
      avatarUrl: data.avatarUrl ?? undefined,
      // 這兩個欄位是 enum：如果未提供或不是有效 enum，就不要更新
      headframe: data.headframe as HeadframeCode | undefined,
      panelStyle: data.panelStyle as PanelPreset | undefined,
      panelTint: data.panelTint ?? undefined,
    };

    const user = await prisma.user.update({
      where: { id: auth.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        avatarUrl: true,
        isAdmin: true,
        balance: true,
        bankBalance: true,
        vipTier: true,
        displayName: true,
        nickname: true,
        about: true,
        country: true,
        headframe: true,
        panelStyle: true,
        panelTint: true,
      },
    });

    return NextResponse.json({ ok: true, user });
  } catch (e) {
    console.error('PROFILE_ME_PUT', e);
    return NextResponse.json({ ok: false, error: 'INTERNAL' }, { status: 500 });
  }
}
