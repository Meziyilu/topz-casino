// app/api/users/me/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const ctx = getAuthFromRequest(req);
    if (!ctx) return NextResponse.json({ ok: false }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: ctx.uid },
      select: { id: true, email: true, displayName: true, isAdmin: true }
    });

    if (!user) return NextResponse.json({ ok: false }, { status: 401 });
    return NextResponse.json({ ok: true, user });
  } catch (e) {
    console.error('ME_ERROR', e);
    return NextResponse.json({ ok: false, error: 'INTERNAL' }, { status: 500 });
  }
}
