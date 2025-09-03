import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ResetSchema } from '@/lib/validation';
import { hashPassword } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, newPassword } = ResetSchema.parse(body);

    const row = await prisma.passwordResetToken.findUnique({ where: { token } });
    if (!row) return NextResponse.json({ error: 'TOKEN_INVALID' }, { status: 400 });
    if (row.usedAt) return NextResponse.json({ error: 'TOKEN_USED' }, { status: 400 });
    if (row.expiredAt < new Date()) return NextResponse.json({ error: 'TOKEN_EXPIRED' }, { status: 400 });

    const passHash = await hashPassword(newPassword);

    await prisma.$transaction([
      prisma.user.update({ where: { id: row.userId }, data: { password: passHash } }),
      prisma.passwordResetToken.update({ where: { token }, data: { usedAt: new Date() } }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err.name === 'ZodError') return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
    console.error('reset error', err);
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
