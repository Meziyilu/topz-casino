// app/api/profile/me/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { z } from 'zod';
import { HeadframeCode, PanelPreset, Prisma } from '@prisma/client';

// 將空字串 → undefined（避免驗證失敗）
const emptyToUndef = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), schema);

// 欄位正規化（去頭尾空白 & 空字串轉 undefined）
const trimToUndef = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => {
    if (typeof v === 'string') {
      const t = v.trim();
      return t === '' ? undefined : t;
    }
    return v;
  }, schema);

// Zod schema：所有欄位都容許「不傳」或「空字串」
const PutSchema = z.object({
  displayName: trimToUndef(z.string().min(2).max(20)).optional(),
  nickname: trimToUndef(z.string().max(30)).optional(),
  about: trimToUndef(z.string().max(200)).optional(),
  country: trimToUndef(
    z
      .string()
      .max(2)
      .transform((s) => (s ? s.toUpperCase() : s))
  ).optional(),
  // 空或合法 URL
  avatarUrl: emptyToUndef(z.string().url()).optional(),
  // enum：空字串會被轉成 undefined（=> 不更新），傳錯值會 400
  headframe: emptyToUndef(z.nativeEnum(HeadframeCode)).optional(),
  panelStyle: emptyToUndef(z.nativeEnum(PanelPreset)).optional(),
  panelTint: trimToUndef(z.string().max(16)).optional(),
});

// GET /api/profile/me
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

// PUT /api/profile/me
export async function PUT(req: NextRequest) {
  try {
    const auth = await getUserFromRequest(req);
    if (!auth?.id) return NextResponse.json({ ok: false }, { status: 401 });

    // 支援 JSON / formData
    const isJson = req.headers.get('content-type')?.includes('application/json');
    let raw: Record<string, any> = {};
    if (isJson) {
      raw = await req.json();
    } else {
      const fd = await req.formData();
      fd.forEach((v, k) => (raw[k] = typeof v === 'string' ? v : String(v)));
    }

    const parsed = PutSchema.safeParse(raw);
    if (!parsed.success) {
      console.warn('PROFILE_ME_PUT_BAD_PAYLOAD', parsed.error.flatten());
      return NextResponse.json({ ok: false, error: 'BAD_PAYLOAD' }, { status: 400 });
    }
    const data = parsed.data;

    const updateData: Prisma.UserUpdateInput = {
      displayName: data.displayName ?? undefined,
      nickname: data.nickname ?? undefined,
      about: data.about ?? undefined,
      country: data.country ?? undefined,
      avatarUrl: data.avatarUrl ?? undefined,
      // ✅ 這兩行改成 { set: ... }，保證通過型別檢查
      headframe: data.headframe !== undefined ? { set: data.headframe as HeadframeCode } : undefined,
      panelStyle: data.panelStyle !== undefined ? { set: data.panelStyle as PanelPreset } : undefined,
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
