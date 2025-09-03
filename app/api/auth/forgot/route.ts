// app/api/auth/forgot/route.ts
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import crypto from 'node:crypto';

const ForgotSchema = z.object({ email: z.string().email() });

function token32() { return crypto.randomBytes(16).toString('hex'); }

export async function POST(req: NextRequest) {
  const isJson = req.headers.get('content-type')?.includes('application/json');
  const raw = isJson ? await req.json() : Object.fromEntries(await req.formData());
  const parsed = ForgotSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email }, select: { id: true } });
  if (user) {
    const token = token32();
    const expiredAt = new Date(Date.now() + 60 * 60 * 1000); // 1h
    await prisma.passwordResetToken.upsert({
      where: { userId: user.id },
      update: { token, expiredAt, usedAt: null },
      create: { userId: user.id, token, expiredAt },
    });
    const base = process.env.APP_URL ?? req.nextUrl.origin;
    return NextResponse.json({ ok: true, resetUrl: `${base}/reset?token=${token}` });
  }
  // 為避免暴露帳號存在與否，仍回 ok
  return NextResponse.json({ ok: true });
}
