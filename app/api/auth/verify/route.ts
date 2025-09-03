// app/api/auth/verify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') || '';
  if (!token) return NextResponse.json({ ok: false }, { status: 400 });

  const t = await prisma.emailVerifyToken.findUnique({ where: { token } });
  if (!t || t.usedAt || t.expiredAt < new Date()) {
    return NextResponse.json({ ok: false, code: 'TOKEN_INVALID_OR_EXPIRED' }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: t.userId }, data: { emailVerifiedAt: new Date() } }),
    prisma.emailVerifyToken.update({ where: { token }, data: { usedAt: new Date() } }),
  ]);

  // 這裡你可以 redirect 到 /login?verified=1
  return NextResponse.redirect(new URL('/login?verified=1', process.env.APP_URL || req.nextUrl));
}
