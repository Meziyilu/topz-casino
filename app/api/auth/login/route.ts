import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import { parseFormData } from '@/lib/form';

const ACCESS_TTL: SignOptions['expiresIn'] = (process.env.JWT_ACCESS_TTL as any) || '15m';
const REFRESH_TTL: SignOptions['expiresIn'] = (process.env.JWT_REFRESH_TTL as any) || '7d';
const JWT_SECRET = (process.env.JWT_SECRET || '') as jwt.Secret;
const REFRESH_SECRET = (process.env.JWT_REFRESH_SECRET || '') as jwt.Secret;

function getIp(req: NextRequest) {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    '0.0.0.0'
  );
}

export async function POST(req: NextRequest) {
  try {
    const isJson = req.headers.get('content-type')?.includes('application/json');
    const body = isJson ? await req.json() : await parseFormData(req);
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');

    if (!email || !password) {
      return NextResponse.json({ ok: false, error: 'MISSING_CREDENTIALS' }, { status: 400 });
    }
    if (!JWT_SECRET || !REFRESH_SECRET) {
      return NextResponse.json({ ok: false, error: 'SERVER_MISCONFIGURED' }, { status: 500 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        displayName: true,
        isAdmin: true,
        isBanned: true,
        emailVerifiedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ ok: false, error: 'INVALID_LOGIN' }, { status: 401 });
    }
    if (user.isBanned) {
      return NextResponse.json({ ok: false, error: 'ACCOUNT_BANNED' }, { status: 403 });
    }
    // 若你目前還未開啟 Email 驗證，可先註解此段
    // if (!user.emailVerifiedAt) {
    //   return NextResponse.json({ ok: false, error: 'EMAIL_NOT_VERIFIED' }, { status: 403 });
    // }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return NextResponse.json({ ok: false, error: 'INVALID_LOGIN' }, { status: 401 });
    }

    const ip = getIp(req);
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), lastLoginIp: ip },
    });

    const accessPayload = { uid: user.id, typ: 'access' as const };
    const refreshPayload = { uid: user.id, typ: 'refresh' as const };

    const accessToken = jwt.sign(accessPayload, JWT_SECRET, { expiresIn: ACCESS_TTL });
    const refreshToken = jwt.sign(refreshPayload, REFRESH_SECRET, { expiresIn: REFRESH_TTL });

    const res = NextResponse.json({
      ok: true,
      user: { id: user.id, email: user.email, displayName: user.displayName, isAdmin: user.isAdmin },
    });

    const isProd = process.env.NODE_ENV === 'production';
    res.cookies.set('token', accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd,
      path: '/',
      maxAge: 60 * 60, // 1h（與 15m access token 壽命不完全一致沒關係，下次請求會 refresh）
    });
    res.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd,
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7d
    });

    return res;
  } catch (err) {
    console.error('LOGIN_ERROR', err);
    return NextResponse.json({ ok: false, error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
