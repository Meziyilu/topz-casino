import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseFormData } from '@/lib/form';
import { randomBytes } from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const isJson = req.headers.get('content-type')?.includes('application/json');
    const body = isJson ? await req.json() : await parseFormData(req);
    const email = String(body.email || '').trim().toLowerCase();
    if (!email) return NextResponse.json({ ok: false, error: 'MISSING_EMAIL' }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });

    // 一律回 ok，避免洩漏帳號存在與否
    if (!user) return NextResponse.json({ ok: true });

    const token = randomBytes(32).toString('hex');
    const expiredAt = new Date(Date.now() + 1000 * 60 * 30); // 30 分鐘

    await prisma.passwordResetToken.upsert({
      where: { userId: user.id },
      update: { token, expiredAt, usedAt: null },
      create: { userId: user.id, token, expiredAt },
    });

    // 真發信可在此呼叫寄信服務；現在先回 resetUrl 讓你測試
    return NextResponse.json({ ok: true, resetUrl: `/reset?token=${token}` });
  } catch (err) {
    console.error('FORGOT_ERROR', err);
    return NextResponse.json({ ok: false, error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
