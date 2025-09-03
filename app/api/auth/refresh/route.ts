import { NextRequest, NextResponse } from 'next/server';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';

// ===== TTL 與 Secret：先拿到字串預設，再斷言到 SignOptions['expiresIn']/jwt.Secret =====
const RAW_ACCESS_TTL = process.env.JWT_ACCESS_TTL ?? '15m';
const RAW_REFRESH_TTL = process.env.JWT_REFRESH_TTL ?? '7d';
const ACCESS_TTL: SignOptions['expiresIn'] = RAW_ACCESS_TTL as unknown as SignOptions['expiresIn'];
const REFRESH_TTL: SignOptions['expiresIn'] = RAW_REFRESH_TTL as unknown as SignOptions['expiresIn'];

const JWT_SECRET = (process.env.JWT_SECRET || '') as jwt.Secret;
const REFRESH_SECRET = (process.env.JWT_REFRESH_SECRET || '') as jwt.Secret;

// 轉換 '15m' / '7d' / number → cookie maxAge(秒)
function ttlToSeconds(ttl: SignOptions['expiresIn']): number {
  if (typeof ttl === 'number') return ttl;
  const s = String(ttl);
  const m = s.match(/^(\d+)([smhd])$/);
  if (!m) return 3600; // fallback 1h
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
      select: { id: true, isAdmin: true, isBanned: true, emailVerifiedAt: true },
    });
    if (!user) return NextResponse.json({ ok: false, error: 'USER_NOT_FOUND' }, { status: 404 });
    if (user.isBanned) return NextResponse.json({ ok: false, error: 'ACCOUNT_BANNED' }, { status: 403 });

    // 要強制驗證再開
    // if (!user.emailVerifiedAt) return NextResponse.json({ ok: false, error: 'EMAIL_NOT_VERIFIED' }, { status: 403 });

    const accessPayload = { uid: user.id, isAdmin: user.isAdmin, isVerified: !!user.emailVerifiedAt, typ: 'access' as const };
    const accessToken = jwt.sign(accessPayload, JWT_SECRET, { expiresIn: ACCESS_TTL } as SignOptions);

    const res = NextResponse.json({ ok: true });
    const isProd = process.env.NODE_ENV === 'production';
    res.cookies.set('token', accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd,
      path: '/',
      maxAge: ttlToSeconds(ACCESS_TTL),
    });

    // 可選：刷新 refresh_token 的有效期（一般不重簽就不要動）
    // res.cookies.set('refresh_token', refreshCookie, { ...同上, maxAge: ttlToSeconds(REFRESH_TTL) });

    return res;
  } catch (e) {
    console.error('REFRESH_ERROR', e);
    return NextResponse.json({ ok: false, error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
