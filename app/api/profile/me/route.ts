// app/api/profile/me/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// 與前端 HEADFRAMES.value 一致（請對齊 Prisma enum）
const ALLOWED_HEADFRAMES = new Set([
  'NEON_AZURE',
  'NEON_VIOLET',
  'NEON_EMERALD',
  'GOLD_RING',
  'SILVER_RING',
  'NONE',
]);

// 允許更新的欄位（全部 optional）
const PutSchema = z.object({
  displayName: z.string().min(2).max(20).optional(),
  nickname: z.string().max(30).optional(),
  about: z.string().max(200).optional(),
  country: z.string().max(2).optional(),
  avatarUrl: z.string().url().optional(),
  headframe: z.string().optional(),     // 後面做白名單檢查
  panelStyle: z.string().optional(),    // 若未來用 enum 再改
  panelTint: z.string().max(16).optional(), // HEX 或 key
});

// GET 個資
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

// 更新個資
export async function PUT(req: NextRequest) {
  try {
    const auth = await getUserFromRequest(req);
    if (!auth?.id) return NextResponse.json({ ok: false }, { status: 401 });

    const isJson = req.headers.get('content-type')?.includes('application/json');
    let raw: any;
    if (isJson) {
      raw = await req.json();
    } else {
      const fd = await req.formData();
      raw = {} as Record<string, string>;
      fd.forEach((v, k) => (raw[k] = String(v)));
    }

    const parsed = PutSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: 'BAD_PAYLOAD' }, { status: 400 });
    }
    const data = parsed.data;

    // 準備要更新的欄位（undefined 就不更新）
    const updateData: any = {
      displayName: data.displayName ?? undefined,
      nickname: data.nickname ?? undefined,
      about: data.about ?? undefined,
      country: data.country ?? undefined,
      avatarUrl: data.avatarUrl ?? undefined,
      panelStyle: data.panelStyle ?? undefined, // string-safe
      panelTint: data.panelTint ?? undefined,
    };

    // headframe 僅允許白名單內（對齊 Prisma enum）
    if (data.headframe && ALLOWED_HEADFRAMES.has(data.headframe)) {
      updateData.headframe = data.headframe;
    }

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
