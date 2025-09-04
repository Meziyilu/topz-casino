// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { parseFormData } from '@/lib/form';
import { signAccess, signRefresh, setAuthCookies } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const isJson = req.headers.get('content-type')?.includes('application/json');
    const raw = isJson ? await req.json() : await parseFormData(req);
    const email = String((raw as any).email || '').trim().toLowerCase();
    const password = String((raw as any).password || '');

    if (!email || !password) {
      return NextResponse.json({ ok: false, error: 'MISSING_FIELDS' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return NextResponse.json({ ok: false, error: 'INVALID_CREDENTIALS' }, { status: 401 });
    if (user.isBanned) return NextResponse.json({ ok: false, error: 'ACCOUNT_BANNED' }, { status: 403 });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return NextResponse.json({ ok: false, error: 'INVALID_CREDENTIALS' }, { status: 401 });

    const access = signAccess(user.id, user.isAdmin);
    const refresh = signRefresh(user.id);

    // 非阻塞更新登入資訊
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.ip || '';
    prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date(), lastLoginIp: ip } }).catch(() => {});

    const res = NextResponse.json({ ok: true });
    setAuthCookies(res, access, refresh);
    return res;
  } catch (e) {
    console.error('LOGIN_ERROR', e);
    return NextResponse.json({ ok: false, error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
