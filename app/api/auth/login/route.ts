import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dayjs from 'dayjs';

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const ct = req.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    return NextResponse.json({ message: 'Content-Type 必須為 application/json' }, { status: 415 });
  }

  const raw = await req.json();
  const parsed = LoginSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ message: '參數錯誤' }, { status: 400 });
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return NextResponse.json({ message: '帳號或密碼錯誤' }, { status: 401 });
  if (user.isBanned) return NextResponse.json({ message: '帳號已被封禁' }, { status: 403 });
  if (!user.emailVerifiedAt) {
    return NextResponse.json({ message: 'Email 未驗證' }, { status: 403 });
  }

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return NextResponse.json({ message: '帳號或密碼錯誤' }, { status: 401 });

  const secret = process.env.JWT_SECRET!;
  const access = jwt.sign({ sub: user.id, typ: 'access' }, secret, { expiresIn: '15m' });
  const refresh = jwt.sign({ sub: user.id, typ: 'refresh' }, secret, { expiresIn: '7d' });

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '0.0.0.0';
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date(), lastLoginIp: ip },
  });

  const res = NextResponse.json({ ok: true });

  // 設置 httpOnly Cookie
  res.cookies.set('token', access, {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: 60 * 15,
  });
  res.cookies.set('refresh_token', refresh, {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });

  return res;
}
