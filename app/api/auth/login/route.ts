// app/api/auth/login/route.ts
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import argon2 from 'argon2';
import { setAuthCookies, getClientIp } from '@/lib/auth';

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const isJson = req.headers.get('content-type')?.includes('application/json');
  const raw = isJson ? await req.json() : Object.fromEntries(await req.formData());
  const parsed = LoginSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, errors: parsed.error.flatten() }, { status: 400 });
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return NextResponse.json({ ok: false, message: '帳號或密碼錯誤' }, { status: 401 });

  if (!user.emailVerifiedAt) {
    return NextResponse.json({ ok: false, message: 'Email 尚未驗證' }, { status: 403 });
  }
  if (user.isBanned) {
    return NextResponse.json({ ok: false, message: '帳號已封禁' }, { status: 403 });
  }

  const ok = await argon2.verify(user.password, password);
  if (!ok) return NextResponse.json({ ok: false, message: '帳號或密碼錯誤' }, { status: 401 });

  setAuthCookies(user.id);

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date(), lastLoginIp: getClientIp(req) },
  });

  return NextResponse.json({ ok: true });
}
