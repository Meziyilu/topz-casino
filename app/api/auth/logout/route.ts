export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import argon2 from 'argon2';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

function isBcrypt(hash: string) {
  // 常見 bcrypt 前綴：$2a$, $2b$, $2y$
  return /^\$(2[aby])\$\d{2}\$/.test(hash);
}
function isArgon2(hash: string) {
  // 常見 argon2 前綴：$argon2i$、$argon2id$
  return /^\$argon2(id|i)\$/.test(hash);
}

export async function POST(req: NextRequest) {
  try {
    const isJson = req.headers.get('content-type')?.includes('application/json');
    const body = isJson ? await req.json() : Object.fromEntries((await req.formData()).entries());
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');

    if (!email || !password) {
      return NextResponse.json({ ok: false, error: 'MISSING_FIELDS' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.isBanned) {
      return NextResponse.json({ ok: false, error: 'INVALID_CREDENTIALS' }, { status: 401 });
    }

    const hash = user.password || '';
    let ok = false;
    if (isBcrypt(hash)) {
      ok = await bcrypt.compare(password, hash);
    } else if (isArgon2(hash)) {
      ok = await argon2.verify(hash, password);
    } else {
      // 不認得前綴，試著兩邊都驗一次
      ok = (await bcrypt.compare(password, hash).catch(() => false)) ||
           (await argon2.verify(hash, password).catch(() => false));
    }

    if (!ok) {
      return NextResponse.json({ ok: false, error: 'INVALID_CREDENTIALS' }, { status: 401 });
    }

    // 簽發 JWT，payload 用 { id }（與你 /api/users/me 對齊）
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });

    // 非阻塞更新登入資訊
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.ip || '';
    prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date(), lastLoginIp: ip } }).catch(() => {});

    const res = NextResponse.json({ ok: true });
    res.cookies.set('token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });
    return res;
  } catch (e) {
    console.error('LOGIN', e);
    return NextResponse.json({ ok: false, error: 'INTERNAL' }, { status: 500 });
  }
}
