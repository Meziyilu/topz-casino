import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { parseFormData } from '@/lib/form';

export async function POST(req: NextRequest) {
  try {
    const isJson = req.headers.get('content-type')?.includes('application/json');
    const raw = isJson ? await req.json() : await parseFormData(req);
    const email = String((raw as any).email || '').trim().toLowerCase();
    if (!email) return NextResponse.json({ ok: false, error: 'MISSING_EMAIL' }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (!user) return NextResponse.json({ ok: true }); // 不洩漏帳號存在與否

    const token = crypto.randomBytes(16).toString('hex'); // 32字
    const expiredAt = new Date(Date.now() + 1000 * 60 * 30); // 30分鐘
    await prisma.passwordResetToken.upsert({
      where: { userId: user.id },
      update: { token, expiredAt, usedAt: null },
      create: { userId: user.id, token, expiredAt },
    });

    // 這裡你可回傳 resetUrl，或日後接郵件服務
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('FORGOT_ERROR', e);
    return NextResponse.json({ ok: false, error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
