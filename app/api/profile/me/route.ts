import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { z } from 'zod';
import type { Prisma, HeadframeCode } from '@prisma/client';
import { HeadframeCode as HF } from '@prisma/client';

// ------- Zod schema -------
// headframe 用 Prisma enum；panelStyle 先當作 string（最保險）
const PutSchema = z.object({
  displayName: z.string().min(2).max(20).optional(),
  nickname: z.string().max(30).optional(),
  about: z.string().max(200).optional(),
  country: z.string().max(2).optional(),
  avatarUrl: z.string().url().optional(),
  headframe: z.nativeEnum(HF).optional(),   // ← enum
  panelStyle: z.string().max(64).optional(),// ← 字串（若你的 schema 是 enum，見下方說明）
  panelTint: z.string().max(16).optional(),
});

// ------- GET /api/profile/me -------
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

// ------- PUT /api/profile/me -------
export async function PUT(req: NextRequest) {
  try {
    const auth = await getUserFromRequest(req);
    if (!auth?.id) return NextResponse.json({ ok: false }, { status: 401 });

    // 支援 JSON 與 form-data
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

    const updateData: Prisma.UserUpdateInput = {
      displayName: data.displayName ?? undefined,
      nickname: data.nickname ?? undefined,
      about: data.about ?? undefined,
      country: data.country ?? undefined,
      avatarUrl: data.avatarUrl ?? undefined,
      headframe: data.headframe as HeadframeCode | undefined, // enum 安全
      panelStyle: data.panelStyle ?? undefined,                // 字串安全
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
