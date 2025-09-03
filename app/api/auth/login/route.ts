import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseBody } from '@/lib/http';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const REFRESH_SECRET = process.env.REFRESH_SECRET || JWT_SECRET;
const ACCESS_TTL = process.env.JWT_EXPIRES || '15m';
const REFRESH_TTL = process.env.REFRESH_EXPIRES || '7d';
const VERIFY_MODE = (process.env.EMAIL_VERIFICATION_MODE || 'strict').toLowerCase(); // 'strict' | 'soft'

function getClientIp(req: NextRequest) {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    (req as any).ip ||
    req.headers.get('x-real-ip') ||
    null
  );
}

export async function POST(req: NextRequest) {
  try {
    const raw = await parseBody(req);
    const parsed = LoginSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, code: 'INVALID_INPUT', issues: parsed.error.issues }, { status: 400 });
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true, email: true, password: true,
        isAdmin: true, isBanned: true, emailVerifiedAt: true,
        displayName: true, avatarUrl: true,
      },
    });
    if (!user) return NextResponse.json({ ok: false, code: 'INVALID_CREDENTIALS' }, { status: 401 });
    if (user.isBanned) return NextResponse.json({ ok: false, code: 'ACCOUNT_BANNED' }, { status: 403 });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return NextResponse.json({ ok: false, code: 'INVALID_CREDENTIALS' }, { status: 401 });

    if (VERIFY_MODE === 'strict' && !user.emailVerifiedAt) {
      return NextResponse.json({ ok: false, code: 'EMAIL_UNVERIFIED' }, { status: 403 });
    }

    const isVerified = !!user.emailVerifiedAt;
    const accessPayload = { uid: user.id, isAdmin: user.isAdmin, isVerified };
    const refreshPayload = { uid: user.id, typ: 'refresh' as const };

    const accessToken = jwt.sign(accessPayload, JWT_SECRET, { expiresIn: ACCESS_TTL });
    const refreshToken = jwt.sign(refreshPayload, REFRESH_SECRET, { expiresIn: REFRESH_TTL });

    const res = NextResponse.json({
      ok: true,
      user: {
        id: user.id, email: user.email, displayName: user.displayName,
        avatarUrl: user.avatarUrl, isAdmin: user.isAdmin, isVerified,
      },
    });

    const accessMaxAge =
      typeof ACCESS_TTL === 'string' && ACCESS_TTL.endsWith('m') ? parseInt(ACCESS_TTL) * 60 : 15 * 60;
    const refreshMaxAge =
      typeof REFRESH_TTL === 'string' && REFRESH_TTL.endsWith('d') ? parseInt(REFRESH_TTL) * 86400 : 7 * 86400;

    const secure = process.env.NODE_ENV === 'production';

    res.cookies.set('token', accessToken, { httpOnly: true, secure, sameSite: 'lax', path: '/', maxAge: accessMaxAge });
    res.cookies.set('refresh_token', refreshToken, { httpOnly: true, secure, sameSite: 'lax', path: '/', maxAge: refreshMaxAge });

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), lastLoginIp: getClientIp(req) },
      select: { id: true },
    });

    return res;
  } catch (err) {
    console.error('[LOGIN_ERR]', err);
    return NextResponse.json({ ok: false, code: 'SERVER_ERROR' }, { status: 500 });
  }
}
