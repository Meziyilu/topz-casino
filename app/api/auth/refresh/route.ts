import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const REFRESH_SECRET = process.env.REFRESH_SECRET || process.env.JWT_SECRET || 'dev-secret-change-me';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const ACCESS_TTL = process.env.JWT_EXPIRES || '15m';

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('refresh_token')?.value;
    if (!token) return NextResponse.json({ ok: false, code: 'NO_REFRESH' }, { status: 401 });

    const payload = jwt.verify(token, REFRESH_SECRET) as any;
    if (payload.typ !== 'refresh') throw new Error('BAD_TOKEN');

    // 確認使用者狀態
    const user = await prisma.user.findUnique({ where: { id: payload.uid }, select: { id: true, isBanned: true, isAdmin: true, emailVerifiedAt: true } });
    if (!user || user.isBanned) return NextResponse.json({ ok: false, code: 'FORBIDDEN' }, { status: 403 });

    const isVerified = !!user.emailVerifiedAt;
    const access = jwt.sign({ uid: user.id, isAdmin: user.isAdmin, isVerified }, JWT_SECRET, { expiresIn: ACCESS_TTL });

    const res = NextResponse.json({ ok: true });
    const accessMaxAge =
      typeof ACCESS_TTL === 'string' && ACCESS_TTL.endsWith('m') ? parseInt(ACCESS_TTL) * 60 : 15 * 60;
    const secure = process.env.NODE_ENV === 'production';
    res.cookies.set('token', access, { httpOnly: true, secure, sameSite: 'lax', path: '/', maxAge: accessMaxAge });
    return res;
  } catch (err) {
    console.error('[REFRESH_ERR]', err);
    return NextResponse.json({ ok: false, code: 'SERVER_ERROR' }, { status: 500 });
  }
}
