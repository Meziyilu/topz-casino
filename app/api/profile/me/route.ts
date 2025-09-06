// app/api/profile/me/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { z } from 'zod';
import { HeadframeCode, PanelPreset, Prisma } from '@prisma/client';

// ====== Zod schema：用 Prisma enum 做型別驗證 ======
const PutSchema = z.object({
  displayName: z.string().min(2).max(20).optional(),
  nickname: z.string().max(30).optional(),
  about: z.string().max(200).optional(),
  country: z.string().max(2).optional(),
  avatarUrl: z.string().url().optional(),
  headframe: z.nativeEnum(HeadframeCode).optional(),
  panelStyle: z.nativeEnum(PanelPreset).optional(),
  panelTint: z.string().max(16).optional(), // e.g. '#AABBCC'
});

// ====== GET /api/profile/me ======
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

// ====== PUT /api/profile/me ======
export async function PUT(req: NextRequest) {
  try {
    const auth = await getUserFromRequest(req);
    if (!auth?.id) return NextResponse.json({ ok: false }, { status: 401 });

    // 支援 JSON 與 formData
    const isJson = req.headers.get('content-type')?.includes('application/json');
    let raw: Record<string, any> = {};
    if (isJson) {
      raw = await req.json();
    } else {
      const fd = await req.formData();
      fd.forEach((v, k) => (raw[k] = String(v)));
    }

    // 先用 schema 驗證，把字串映射到 enum
    const parsed = PutSchema.safeParse(raw);
    if (!parsed.success) {
      // 統一 400，不把具體 issues 暴露到用戶端（要的話可印在 log）
      console.warn('PROFILE_ME_PUT_BAD_PAYLOAD', parsed.error.flatten());
      return NextResponse.json({ ok: false, error: 'BAD_PAYLOAD' }, { status: 400 });
    }
    const data = parsed.data;

    // 組 updateData（用 undefined 表示不更新）
    const updateData: Prisma.UserUpdateInput = {
      displayName: data.displayName ?? undefined,
      nickname: data.nickname ?? undefined,
      about: data.about ?? undefined,
      country: data.country ?? undefined,
      avatarUrl: data.avatarUrl ?? undefined,
      headframe: data.headframe ?? undefined,     // enum 已驗證
      panelStyle: data.panelStyle ?? undefined,   // enum 已驗證
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
