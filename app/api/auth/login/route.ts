export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import argon2 from 'argon2';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: '缺少帳號或密碼' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: '帳號不存在' }, { status: 401 });
    }

    const ok = await argon2.verify(user.password, password);
    if (!ok) {
      return NextResponse.json({ error: '密碼錯誤' }, { status: 401 });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'dev_secret', { expiresIn: '7d' });

    const res = NextResponse.json({ ok: true, user: { id: user.id, displayName: user.displayName } });
    res.cookies.set('token', token, { httpOnly: true, sameSite: 'lax', secure: true, path: '/' });
    return res;
  } catch (e) {
    console.error('LOGIN', e);
    return NextResponse.json({ error: 'INTERNAL' }, { status: 500 });
  }
}
