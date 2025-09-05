// app/api/users/me/route.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';

const JWT_SECRET = (process.env.JWT_SECRET || '') as jwt.Secret;

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ ok: false }, { status: 401 });

    const decoded = jwt.verify(token, JWT_SECRET) as { uid: string; typ: 'access' };
    if (decoded.typ !== 'access') return NextResponse.json({ ok: false }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: decoded.uid },
      select: { id: true, displayName: true, balance: true, bankBalance: true, vipTier: true, avatarUrl: true },
    });
    if (!user) return NextResponse.json({ ok: false }, { status: 404 });

    return NextResponse.json({ ok: true, user });
  } catch {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
}
