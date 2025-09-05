export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

function getUserIdFromReq(req: NextRequest): string | null {
  try {
    const token = req.cookies.get('token')?.value;
    if (!token) return null;
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret') as { id: string };
    return payload.id;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const id = getUserIdFromReq(req);
    if (!id) return NextResponse.json({ ok: false }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        isAdmin: true,
        balance: true,
        bankBalance: true,
        vipTier: true,
      },
    });

    return NextResponse.json({ ok: true, user });
  } catch (e) {
    console.error('USERS_ME', e);
    return NextResponse.json({ ok: false, error: 'INTERNAL' }, { status: 500 });
  }
}
