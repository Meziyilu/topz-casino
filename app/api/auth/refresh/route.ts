// app/api/auth/refresh/route.ts
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { verifyToken, setAuthCookies } from '@/lib/auth';

export async function POST() {
  const rt = cookies().get('refresh_token')?.value;
  if (!rt) return NextResponse.json({ ok: false, message: '缺少 refresh token' }, { status: 401 });

  const payload = verifyToken<{ sub: string; typ: string }>(rt);
  if (!payload || payload.typ !== 'refresh') {
    return NextResponse.json({ ok: false, message: 'refresh token 無效' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true, isBanned: true } });
  if (!user || user.isBanned) return NextResponse.json({ ok: false, message: '帳號無效' }, { status: 403 });

  setAuthCookies(user.id);
  return NextResponse.json({ ok: true });
}
