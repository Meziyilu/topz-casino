// app/api/users/me/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const auth = getAuthFromRequest(req);
    if (!auth.ok) {
      return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
    }

    const me = await prisma.user.findUnique({
      where: { id: auth.uid },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        isAdmin: true,
        balance: true,
        bankBalance: true,
        headframe: true,
        panelStyle: true,
        vipTier: true,
        level: true,
        xp: true,
      },
    });

    if (!me) return NextResponse.json({ ok: false, error: 'USER_NOT_FOUND' }, { status: 404 });

    return NextResponse.json({ ok: true, user: me });
  } catch (e) {
    console.error('USERS_ME_ERROR', e);
    return NextResponse.json({ ok: false, error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
