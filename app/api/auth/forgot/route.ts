import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ForgotSchema } from '@/lib/validation';
import crypto from 'crypto';

function token32() {
  return crypto.randomBytes(16).toString('hex');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = ForgotSchema.parse(body);

    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    // 不洩露帳號存在與否，統一回成功
    if (!user) return NextResponse.json({ ok: true });

    const token = token32();
    const expiredAt = new Date(Date.now() + 60 * 60 * 1000); // 1h
    await prisma.passwordResetToken.upsert({
      where: { userId: user.id },
      update: { token, expiredAt, usedAt: null },
      create: { userId: user.id, token, expiredAt },
    });

    const base = process.env.APP_BASE_URL ?? 'http://localhost:3000';
    const resetUrl = `${base}/api/auth/reset?token=${token}`;
    // 實務上寄信；先回 resetUrl 方便你測
    return NextResponse.json({ resetUrl });
  } catch (err: any) {
    if (err.name === 'ZodError') return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
    console.error('forgot error', err);
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
