// 強制動態，不參與靜態預算
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { LoginSchema } from '@/lib/validation';
import { comparePassword, signAccessToken, signRefreshToken, setAuthCookies, getClientIp } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = LoginSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true, password: true, isBanned: true, emailVerifiedAt: true,
      },
    });
    if (!user) return NextResponse.json({ error: 'INVALID_CREDENTIALS' }, { status: 401 });
    if (user.isBanned) return NextResponse.json({ error: 'BANNED' }, { status: 403 });
    if (!user.emailVerifiedAt) return NextResponse.json({ error: 'EMAIL_NOT_VERIFIED' }, { status: 403 });

    const ok = await comparePassword(password, user.password);
    if (!ok) return NextResponse.json({ error: 'INVALID_CREDENTIALS' }, { status: 401 });

    const access = signAccessToken(user.id);
    const refresh = signRefreshToken(user.id);
    setAuthCookies(access, refresh);

    const ip = getClientIp(req);
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date(), lastLoginIp: ip } });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err.name === 'ZodError') return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
    console.error('login error', err);
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
