export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';

export async function POST(req: NextRequest) {
  try {
    const { email, password, displayName } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: '缺少帳號或密碼' }, { status: 400 });
    }

    const existed = await prisma.user.findUnique({ where: { email } });
    if (existed) {
      return NextResponse.json({ error: '帳號已存在' }, { status: 400 });
    }

    const hash = await argon2.hash(password);

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        password: hash,
        displayName: (displayName && String(displayName).trim()) || email.split('@')[0],
        // 其他 v1.1.2 欄位若有預設值要一起填就在這裡補
        // isBanned: false, isMuted: false, vipTier: 0, ...
      },
      select: { id: true, displayName: true }
    });

    // === 自動登入：簽發 JWT 並寫入 Cookie ===
    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET || 'dev_secret',
      { expiresIn: '7d' }
    );

    const res = NextResponse.json({ ok: true, user });
    const isProd = process.env.NODE_ENV === 'production';

    res.cookies.set('token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd,
      path: '/',
      // 7 天
      maxAge: 7 * 24 * 60 * 60,
    });

    return res;
  } catch (e) {
    console.error('REGISTER', e);
    return NextResponse.json({ error: 'INTERNAL' }, { status: 500 });
  }
}
