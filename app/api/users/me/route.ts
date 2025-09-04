// app/api/users/me/route.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ ok: false, reason: 'NO_TOKEN' }, { status: 401 });

    const JWT_SECRET = (process.env.JWT_SECRET || '') as jwt.Secret;
    const payload = jwt.verify(token, JWT_SECRET) as any;
    const user = await prisma.user.findUnique({ where: { id: payload.uid }, select: { id: true, email: true, displayName: true, isAdmin: true } });
    if (!user) return NextResponse.json({ ok: false, reason: 'NOT_FOUND' }, { status: 404 });
    return NextResponse.json({ ok: true, user });
  } catch (e) {
    return NextResponse.json({ ok: false, reason: 'BAD_TOKEN' }, { status: 401 });
  }
}
