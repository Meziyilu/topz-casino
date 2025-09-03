import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { parseFormData } from '@/lib/form';

export async function POST(req: NextRequest) {
  try {
    const isJson = req.headers.get('content-type')?.includes('application/json');
    const body = isJson ? await req.json() : await parseFormData(req);

    const token = String(body.token || '');
    const newPassword = String(body.newPassword || '');
    if (!token || !newPassword) {
      return NextResponse.json({ ok: false, error: 'MISSING_FIELDS' }, { status: 400 });
    }

    const reset = await prisma.passwordResetToken.findUnique({
      where: { token },
      select: { id: true, userId: true, usedAt: true, expiredAt: true },
    });
    if (!reset || reset.usedAt || reset.expiredAt < new Date()) {
      return NextResponse.json({ ok: false, error: 'INVALID_OR_EXPIRED' }, { status: 400 });
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    await prisma.$transaction([
      prisma.user.update({ where: { id: reset.userId }, data: { password: hashed } }),
      prisma.passwordResetToken.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('RESET_ERROR', err);
    return NextResponse.json({ ok: false, error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
