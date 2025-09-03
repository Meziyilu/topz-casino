import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseBody } from '@/lib/http';
import { z } from 'zod';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const ForgotSchema = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
  try {
    const raw = await parseBody(req);
    const parsed = ForgotSchema.safeParse(raw);
    if (!parsed.success) return NextResponse.json({ ok: false, code: 'INVALID_INPUT' }, { status: 400 });

    const { email } = parsed.data;
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });

    // 不暴露帳號存在與否
    if (!user) return NextResponse.json({ ok: true });

    const token = crypto.randomBytes(16).toString('hex'); // 32字
    const expiredAt = new Date(Date.now() + 1000 * 60 * 30); // 30 分鐘

    await prisma.passwordResetToken.upsert({
      where: { userId: user.id },
      update: { token, expiredAt, usedAt: null },
      create: { userId: user.id, token, expiredAt },
    });

    const resetUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/reset?token=${token}`;
    return NextResponse.json({ ok: true, resetUrl });
  } catch (err) {
    console.error('[FORGOT_ERR]', err);
    return NextResponse.json({ ok: false, code: 'SERVER_ERROR' }, { status: 500 });
  }
}
