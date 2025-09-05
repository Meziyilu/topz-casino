export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ ok: false }, { status: 401 });

    const decoded = jwt.verify(token, JWT_SECRET) as { id?: string };
    if (!decoded?.id) return NextResponse.json({ ok: false }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true, email: true, displayName: true,
        avatarUrl: true, vipTier: true,
        balance: true, bankBalance: true, isAdmin: true,
      },
    });
    if (!user) return NextResponse.json({ ok: false }, { status: 404 });

    return NextResponse.json({ ok: true, user });
  } catch (e) {
    console.error('ME', e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
