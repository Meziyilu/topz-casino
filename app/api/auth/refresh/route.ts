// 強制動態，不參與靜態預算
export const dynamic = 'force-dynamic';
export const revalidate = 0;


import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyRefresh, signAccessToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(_req: NextRequest) {
  try {
    const jar = cookies();
    const token = jar.get('refresh_token')?.value;
    if (!token) return NextResponse.json({ error: 'INVALID_REFRESH' }, { status: 401 });

    const payload = verifyRefresh(token);
    if (payload.typ !== 'refresh') return NextResponse.json({ error: 'INVALID_REFRESH' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: { isBanned: true } });
    if (!user || user.isBanned) return NextResponse.json({ error: 'BANNED' }, { status: 403 });

    const access = signAccessToken(payload.sub);
    // 只更新 access；refresh 保持原到期
    jar.set('token', access, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 15 * 60,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: 'INVALID_REFRESH' }, { status: 401 });
  }
}
