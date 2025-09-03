import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { VerifySchema } from '@/lib/validation';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');
    const { token: t } = VerifySchema.parse({ token });

    const row = await prisma.emailVerifyToken.findUnique({ where: { token: t } });
    if (!row) return NextResponse.json({ error: 'TOKEN_INVALID' }, { status: 400 });
    if (row.usedAt) return NextResponse.json({ error: 'TOKEN_USED' }, { status: 400 });
    if (row.expiredAt < new Date()) return NextResponse.json({ error: 'TOKEN_EXPIRED' }, { status: 400 });

    await prisma.$transaction([
      prisma.user.update({ where: { id: row.userId }, data: { emailVerifiedAt: new Date() } }),
      prisma.emailVerifyToken.update({ where: { token: t }, data: { usedAt: new Date() } }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err.name === 'ZodError') return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
    console.error('verify error', err);
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
