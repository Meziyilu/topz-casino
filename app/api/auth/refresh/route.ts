// app/api/auth/refresh/route.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';

const RAW_ACCESS_TTL = process.env.JWT_ACCESS_TTL ?? '15m';
const ACCESS_TTL: SignOptions['expiresIn'] = RAW_ACCESS_TTL as any;
const JWT_SECRET = (process.env.JWT_SECRET || '') as jwt.Secret;
const REFRESH_SECRET = (process.env.JWT_REFRESH_SECRET || '') as jwt.Secret;

const COOKIE_SECURE =
  (process.env.COOKIE_SECURE ?? '').toLowerCase() === 'false'
    ? false
    : process.env.NODE_ENV === 'production';

function ttlToSeconds(ttl: SignOptions['expiresIn']) {
  if (typeof ttl === 'number') return ttl;
  const s = String(ttl);
  const m = s.match(/^(\d+)([smhd])$/);
  if (!m) return 3600;
  const n = parseInt(m[1], 10);
  return m[2] === 's' ? n : m[2] === 'm' ? n * 60 : m[2] === 'h' ? n * 3600 : n * 86400;
}

export async function POST(req: NextRequest) {
  try {
    const rtk = req.cookies.get('refresh_token')?.value;
    if (!rtk) return NextResponse.json({ ok: false }, { status: 401 });

    const decoded = jwt.verify(rtk, REFRESH_SECRET) as { uid: string; typ: 'refresh' };
    if (decoded.typ !== 'refresh') return NextResponse.json({ ok: false }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { id: decoded.uid }, select: { id: true, isAdmin: true, isBanned: true } });
    if (!user || user.isBanned) return NextResponse.json({ ok: false }, { status: 401 });

    const access = jwt.sign({ uid: user.id, isAdmin: user.isAdmin, typ: 'access' as const }, JWT_SECRET, { expiresIn: ACCESS_TTL } as SignOptions);
    const res = NextResponse.json({ ok: true });
    res.cookies.set('token', access, {
      httpOnly: true,
      sameSite: 'lax',
      secure: COOKIE_SECURE,
      path: '/',
      maxAge: ttlToSeconds(ACCESS_TTL),
    });
    return res;
  } catch {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
}
