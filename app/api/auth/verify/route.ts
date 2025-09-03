// app/api/auth/verify/route.ts
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') ?? '';
  if (!token) return NextResponse.json({ ok: false, message: '缺少 token' }, { status: 400 });

  const rec = await prisma.emailVerifyToken.findUnique({ where: { token } });
  if (!rec) return NextResponse.json({ ok: false, message: '無效 token' }, { status: 400 });
  if (rec.usedAt) return NextResponse.json({ ok: false, message: '已使用' }, { status: 410 });
  if (rec.expiredAt < new Date()) return NextResponse.json({ ok: false, message: '已過期' }, { status: 410 });

  await prisma.$transaction([
    prisma.user.update({ where: { id: rec.userId }, data: { emailVerifiedAt: new Date() } }),
    prisma.emailVerifyToken.update({ where: { id: rec.id }, data: { usedAt: new Date() } }),
  ]);

  const url = new URL('/login?verified=1', process.env.APP_URL ?? `${req.nextUrl.protocol}//${req.headers.get('host')}`);
  return NextResponse.redirect(url);
}
