import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import dayjs from 'dayjs';
import crypto from 'node:crypto';

const ForgotSchema = z.object({
  email: z.string().email(),
});

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const ct = req.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    return NextResponse.json({ message: 'Content-Type 必須為 application/json' }, { status: 415 });
  }

  const raw = await req.json();
  const parsed = ForgotSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ message: '參數錯誤' }, { status: 400 });
  }

  const { email } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    const token = crypto.randomBytes(16).toString('hex'); // 32字
    await prisma.passwordResetToken.upsert({
      where: { userId: user.id },
      update: {
        token,
        expiredAt: dayjs().add(1, 'hour').toDate(),
        usedAt: null,
      },
      create: {
        userId: user.id,
        token,
        expiredAt: dayjs().add(1, 'hour').toDate(),
      },
    });
    // 這裡照你的流程：回傳 resetUrl 或寄信
  }

  return NextResponse.json({ ok: true });
}
