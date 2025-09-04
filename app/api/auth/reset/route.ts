import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { parseFormData } from '@/lib/form';

export async function POST(req: NextRequest) {
  try {
    const isJson = req.headers.get('content-type')?.includes('application/json');
    const raw = isJson ? await req.json() : await parseFormData(req);
    const token = String((raw as any).token || '');
    const newPassword = String((raw as any).newPassword || '');
    if (!token || !newPassword) return NextResponse.json({ ok: false, error: 'MISSING_FIELDS' }, { status: 400 });

    const prt = await prisma.passwordResetToken.findFirst({ where: { token } });
    if (!prt || (prt.usedAt != null) || prt.expiredAt < new Date()) {
      return NextResponse.json({ ok: false, error: 'INVALID_OR_EXPIRED' }, { status: 400 });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.$transaction([
      prisma.user.update({ where: { id: prt.userId }, data: { password: hashed } }),
      prisma.passwordResetToken.update({ where: { id: prt.id }, data: { usedAt: new Date() } }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('RESET_ERROR', e);
    return NextResponse.json({ ok: false, error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
