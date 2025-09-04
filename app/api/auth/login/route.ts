import { NextRequest, NextResponse } from 'next/server';
import jwt, { type SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { parseFormData } from '@/lib/form';

// 可選：快速放行測試（設 DEV_BYPASS_LOGIN=1 時，密碼不檢查，帳號不存在會報 401）
const DEV_BYPASS = process.env.DEV_BYPASS_LOGIN === '1';

// TTL / Secret 正規化（把 || 補回來）
const RAW_ACCESS_TTL = process.env.JWT_ACCESS_TTL ?? '15m';
const RAW_REFRESH_TTL = process.env.JWT_REFRESH_TTL ?? '7d';
const ACCESS_TTL: SignOptions['expiresIn'] = RAW_ACCESS_TTL as unknown as SignOptions['expiresIn'];
const REFRESH_TTL: SignOptions['expiresIn'] = RAW_REFRESH_TTL as unknown as SignOptions['expiresIn'];
const JWT_SECRET = (process.env.JWT_SECRET || 'dev_secret') as jwt.Secret;
const REFRESH_SECRET = (process.env.JWT_REFRESH_SECRET || 'dev_refresh') as jwt.Secret;

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

    const isJson = req.headers.get('content-type')?.includes('application/json');
    const body = isJson ? await req.json() : await parseFormData(req);
    const email = String((body as any).email || '').trim().toLowerCase();
    const password = String((body as any).password || '');

    if (!email || !password) {
      return NextResponse.json({ ok: false, error: 'MISSING_FIELDS' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return NextResponse.json({ ok: false, error: 'INVALID_CREDENTIALS' }, { status: 401 });
    if (user.isBanned) return NextResponse.json({ ok: false, error: 'ACCOUNT_BANNED' }, { status: 403 });

    // 密碼驗證（若開 DEV_BYPASS_LOGIN=1 就跳過密碼檢查以快速放行）
    if (!DEV_BYPASS) {
      const ok = await bcrypt.compare(password, user.password);
      if (!ok) return NextResponse.json({ ok: false, error: 'INVALID_CREDENTIALS' }, { status: 401 });
    }

    const accessPayload = { uid: user.id, isAdmin: user.isAdmin, typ: 'access' as const };
    const refreshPayload = { uid: user.id, typ: 'refresh' as const };

    const accessToken = jwt.sign(accessPayload, JWT_SECRET, { expiresIn: ACCESS_TTL } as SignOptions);
    const refreshToken = jwt.sign(refreshPayload, REFRESH_SECRET, { expiresIn: REFRESH_TTL } as SignOptions);

    // 回寫登入資訊（不阻塞）
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.ip || '';
    prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date(), lastLoginIp: ip } }).catch(() => {});

    const res = NextResponse.json({ ok: true });
    const isProd = process.env.NODE_ENV === 'production';
    res.cookies.set('token', accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd,
      path: '/',
      maxAge: ttlToSeconds(ACCESS_TTL),
    });
    res.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd,
      path: '/',
      maxAge: ttlToSeconds(REFRESH_TTL),
    });

    return res;
  } catch (e) {
    console.error('LOGIN_ERROR', e);
    return NextResponse.json({ ok: false, error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
