import { NextRequest, NextResponse } from 'next/server';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';

const RAW_ACCESS_TTL = process.env.JWT_ACCESS_TTL ?? '15m';
const RAW_REFRESH_TTL = process.env.JWT_REFRESH_TTL ?? '7d';
const ACCESS_TTL: SignOptions['expiresIn'] = RAW_ACCESS_TTL as unknown as SignOptions['expiresIn'];
const REFRESH_TTL: SignOptions['expiresIn'] = RAW_REFRESH_TTL as unknown as SignOptions['expiresIn'];

const JWT_SECRET = (process.env.JWT_SECRET || '') as jwt.Secret;
const REFRESH_SECRET = (process.env.JWT_REFRESH_SECRET || '') as jwt.Secret;

function ttlToSeconds(ttl: SignOptions['expiresIn']): number {
  if (typeof ttl === 'number') return ttl;
  const s = String(ttl);
  const m = s.match(/^(\d+)([smhd])$/);
  if (!m) return 3600;
  const n = parseInt(m[1], 10);
  switch (m[2]) {
    case 's': return n;
    case 'm': return n * 60;
    case 'h': return n * 3600;
    case 'd': return n * 86400;
    default: return 3600;
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!JWT_SECRET || !REFRESH_SECRET) {
      return NextResponse.json({ ok: false, error: 'SERVER_MISCONFIGURED' }, { status: 500 });
    }

    const refreshCookie = req.cookies.get('refresh_token')?.value;
    if (!refreshCookie) {
      return NextResponse.json({ ok: false, error: 'NO_REFRESH_TOKEN' }, { status: 401 });
    }

    let payload: any;
    try {
      payload = jwt.verify(refreshCookie, REFRESH_SECRET);
    } catch {
      return NextResponse.json({ ok: false, error: 'INVALID_REFRESH' }, { status: 401 });
    }
    if (!payload || payload.typ !== 'refresh' || !payload.uid) {
      return NextResponse.json({ ok: false, error: 'INVALID_REFRESH' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.uid as string },
      select: { id: true, isAdmin: true, isBanned: true },
    });
    if (!user) return NextResponse.json({ ok: false, error: 'USER_NOT_FOUND' }, { status: 404 });
    if (user.isBanned) return NextResponse.json({ ok: false, error: 'ACCOUNT_BANNED' }, { status: 403 });

    const accessToken = jwt.sign(
      { uid: user.id, isAdmin: user.isAdmin, typ: 'access' as const },
      JWT_SECRET,
      { expiresIn: ACCESS_TTL } as SignOptions
    );

    const res = NextResponse.json({ ok: true });
    const isProd = process.env.NODE_ENV === 'production';
    res.cookies.set('token', accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd,
      path: '/',
      maxAge: ttlToSeconds(ACCESS_TTL),
    });
    return res;
  } catch (e) {
    console.error('REFRESH_ERROR', e);
    return NextResponse.json({ ok: false, error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
