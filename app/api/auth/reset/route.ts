import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

const ResetSchema = z.object({
  token: z.string().min(32),
  newPassword: z.string().min(6),
});

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const ct = req.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    return NextResponse.json({ message: 'Content-Type 必須為 application/json' }, { status: 415 });
  }

  const raw = await req.json();
  const parsed = ResetSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ message: '參數錯誤' }, { status: 400 });
  }

  const { token, newPassword } = parsed.data;
  const rec = await prisma.passwordResetToken.findUnique({ where: { token } });
  if (!rec || (rec.expiredAt && rec.expiredAt < new Date()) || rec.usedAt) {
    return NextResponse.json({ message: '重設連結無效或已過期' }, { status: 400 });
  }

  const hash = await bcrypt.hash(newPassword, 10);
  await prisma.$transaction([
    prisma.user.update({ where: { id: rec.userId }, data: { password: hash } }),
    prisma.passwordResetToken.update({ where: { id: rec.id }, data: { usedAt: new Date() } }),
  ]);

  return NextResponse.json({ ok: true });
}
