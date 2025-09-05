// app/api/profile/me/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { z } from 'zod';

// 允許局部更新的欄位
const PutSchema = z.object({
  displayName: z.string().trim().min(2).max(20).regex(/^[\p{L}\p{N}_]+$/u).optional(),
  about: z.string().trim().max(200).optional().nullable(),
  country: z.string().trim().max(32).optional().nullable(),
  avatarUrl: z.string().url().max(512).optional().nullable(),
  headframe: z.string().trim().max(64).optional().nullable(),
  panelStyle: z.string().trim().max(32).optional().nullable(),
  panelTint: z.string().trim().max(32).optional().nullable(),
});

type AuthedUserMin = { id: string };

export async function GET(req: NextRequest) {
  try {
    // ✅ 一定要 await，且用 id 不是 uid
    const auth = (await getUserFromRequest(req)) as (AuthedUserMin | null);
    if (!auth?.id) return NextResponse.json({ ok: false }, { status: 401 });

    // 你 lib/auth 可能已經查過 DB，但這裡仍以最新資料為準
    const user = await prisma.user.findUnique({
      where: { id: auth.id },
      select: {
        id: true,
        email: true,
        displayName: true,
        name: true,
        avatarUrl: true,
        vipTier: true,
        balance: true,
        bankBalance: true,
        about: true,
        country: true,
        headframe: true,
        panelStyle: true,
        panelTint: true,
        isAdmin: true,
        isBanned: true,
        isMuted: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    if (!user) return NextResponse.json({ ok: false }, { status: 404 });
    return NextResponse.json({ ok: true, user });
  } catch (e) {
    console.error('PROFILE_ME_GET', e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    // ✅ 同理，await + 用 id
    const auth = (await getUserFromRequest(req)) as (AuthedUserMin | null);
    if (!auth?.id) return NextResponse.json({ ok: false }, { status: 401 });

    const isJson = req.headers.get('content-type')?.includes('application/json');
    const raw = isJson
      ? await req.json()
      : (async () => {
          const fd = await req.formData();
          const map: Record<string, string> = {};
          fd.forEach((v, k) => (map[k] = String(v)));
          return map;
        })();

    const parsed = PutSchema.safeParse(await raw);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: 'INVALID_INPUT' }, { status: 400 });
    }
    const data = parsed.data;

    // 檢查暱稱唯一
    if (data.displayName) {
      const exists = await prisma.user.findFirst({
        where: { displayName: data.displayName, NOT: { id: auth.id } },
        select: { id: true },
      });
      if (exists) {
        return NextResponse.json({ ok: false, error: 'DISPLAY_NAME_TAKEN' }, { status: 409 });
      }
    }

    const updated = await prisma.user.update({
      where: { id: auth.id },
      data: {
        displayName: data.displayName ?? undefined,
        about: data.about ?? undefined,
        country: data.country ?? undefined,
        avatarUrl: data.avatarUrl ?? undefined,
        headframe: data.headframe ?? undefined,
        panelStyle: data.panelStyle ?? undefined,
        panelTint: data.panelTint ?? undefined,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        name: true,
        avatarUrl: true,
        vipTier: true,
        balance: true,
        bankBalance: true,
        about: true,
        country: true,
        headframe: true,
        panelStyle: true,
        panelTint: true,
        isAdmin: true,
        isBanned: true,
        isMuted: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    return NextResponse.json({ ok: true, user: updated });
  } catch (e) {
    console.error('PROFILE_ME_PUT', e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
