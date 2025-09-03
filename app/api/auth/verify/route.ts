import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token') || '';

    if (!token) return NextResponse.json({ ok: false, code: 'TOKEN_MISSING' }, { status: 400 });

    const rec = await prisma.emailVerifyToken.findUnique({ where: { token } });
    if (!rec) return NextResponse.json({ ok: false, code: 'TOKEN_INVALID' }, { status: 400 });
    if (rec.usedAt) return NextResponse.json({ ok: false, code: 'TOKEN_USED' }, { status: 400 });
    if (rec.expiredAt < new Date()) return NextResponse.json({ ok: false, code: 'TOKEN_EXPIRED' }, { status: 400 });

    await prisma.$transaction([
      prisma.user.update({ where: { id: rec.userId }, data: { emailVerifiedAt: new Date() } }),
      prisma.emailVerifyToken.update({ where: { token }, data: { usedAt: new Date() } }),
    ]);

    // 你也可以改成 redirect 到 /login?verified=1
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[VERIFY_ERR]', err);
    return NextResponse.json({ ok: false, code: 'SERVER_ERROR' }, { status: 500 });
  }
}
