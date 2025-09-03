import { NextRequest, NextResponse } from 'next/server';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';

const ACCESS_TTL: SignOptions['expiresIn'] =
  ((process.env.JWT_ACCESS_TTL as unknown) as SignOptions['expiresIn']) || '15m';
const REFRESH_TTL: SignOptions['expiresIn'] =
  ((process.env.JWT_REFRESH_TTL as unknown) as SignOptions['expiresIn']) || '7d';

const JWT_SECRET = (process.env.JWT_SECRET || '') as jwt.Secret;
const REFRESH_SECRET = (process.env.JWT_REFRESH_SECRET || '') as jwt.Secret;

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
      select: {
        id: true,
        isAdmin: true,
        isBanned: true,
        emailVerifiedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ ok: false, error: 'USER_NOT_FOUND' }, { status: 404 });
    }
    if (user.isBanned) {
      return NextResponse.json({ ok: false, error: 'ACCOUNT_BANNED' }, { status: 403 });
    }

    // 若你目前未啟用信箱驗證，可放行；要強制驗證就打開下行
    // if (!user.emailVerifiedAt) {
    //   return NextResponse.json({ ok: false, error: 'EMAIL_NOT_VERIFIED' }, { status: 403 });
    // }

    const isVerified = !!user.emailVerifiedAt;

    // 簽發新的 Access Token
    const accessPayload = { uid: user.id, isAdmin: user.isAdmin, isVerified, typ: 'access' as const };
    const accessToken = jwt.sign(accessPayload, JWT_SECRET, {
      expiresIn: ACCESS_TTL,
    } as SignOptions);

    const res = NextResponse.json({ ok: true });

    const isProd = process.env.NODE_ENV === 'production';
    const accessMaxAge =
      typeof ACCESS_TTL === 'number'
        ? ACCESS_TTL
        : ACCESS_TTL.endsWith('d')
        ? parseInt(ACCESS_TTL) * 24 * 60 * 60
        : ACCESS_TTL.endsWith('h')
        ? parseInt(ACCESS_TTL) * 60 * 60
        : ACCESS_TTL.endsWith('m')
        ? parseInt(ACCESS_TTL) * 60
        : 60 * 60; // fallback 1h

    res.cookies.set('token', accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd,
      path: '/',
      maxAge: accessMaxAge,
    });

    return res;
  } catch (err) {
    console.error('REFRESH_ERROR', err);
    return NextResponse.json({ ok: false, error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
