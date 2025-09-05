// app/api/auth/login/route.ts
export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import jwt, { type SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

const RAW_ACCESS_TTL = process.env.JWT_ACCESS_TTL ?? '15m';
const RAW_REFRESH_TTL = process.env.JWT_REFRESH_TTL ?? '7d';
const ACCESS_TTL: SignOptions['expiresIn'] = RAW_ACCESS_TTL as any;
const REFRESH_TTL: SignOptions['expiresIn'] = RAW_REFRESH_TTL as any;
const JWT_SECRET = (process.env.JWT_SECRET || 'dev_secret') as jwt.Secret;
const REFRESH_SECRET = (process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret') as jwt.Secret;

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
    const isJson = req.headers.get('content-type')?.includes('application/json');
    const body = isJson ? await req.json() : Object.fromEntries(await req.formData());
    const email = String((body as any).email || '').trim().toLowerCase();
    const password = String((body as any).password || '');

    if (!email || !password) return NextResponse.json({ ok: false, error: 'MISSING_FIELDS' }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return NextResponse.json({ ok: false, error: 'INVALID_CREDENTIALS' }, { status: 401 });
    if (user.isBanned) return NextResponse.json({ ok: false, error: 'ACCOUNT_BANNED' }, { status: 403 });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return NextResponse.json({ ok: false, error: 'INVALID_CREDENTIALS' }, { status: 401 });

    const accessPayload = { uid: user.id, isAdmin: user.isAdmin, typ: 'access' as const };
    const refreshPayload = { uid: user.id, typ: 'refresh' as const };
    const accessToken = jwt.sign(accessPayload, JWT_SECRET, { expiresIn: ACCESS_TTL } as SignOptions);
    const refreshToken = jwt.sign(refreshPayload, REFRESH_SECRET, { expiresIn: REFRESH_TTL } as SignOptions);

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.ip || '';
    prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date(), lastLoginIp: ip } }).catch(() => {});

    const res = NextResponse.json({ ok: true });
    const isProd = process.env.NODE_ENV === 'production';
    res.cookies.set('token', accessToken, { httpOnly: true, sameSite: 'lax', secure: isProd, path: '/', maxAge: ttlToSeconds(ACCESS_TTL) });
    res.cookies.set('refresh_token', refreshToken, { httpOnly: true, sameSite: 'lax', secure: isProd, path: '/', maxAge: ttlToSeconds(REFRESH_TTL) });
    return res;
  } catch (e) {
    console.error('LOGIN_ERROR', e);
    return NextResponse.json({ ok: false, error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
