// app/api/auth/reset/route.ts
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import argon2 from 'argon2';

const ResetSchema = z.object({
  token: z.string().min(32),
  newPassword: z.string().min(8),
});

export async function POST(req: NextRequest) {
  const isJson = req.headers.get('content-type')?.includes('application/json');
  const raw = isJson ? await req.json() : Object.fromEntries(await req.formData());
  const parsed = ResetSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  const rec = await prisma.passwordResetToken.findUnique({ where: { token: parsed.data.token } });
  if (!rec || rec.usedAt || rec.expiredAt < new Date()) {
    return NextResponse.json({ ok: false, message: 'token 無效' }, { status: 400 });
  }

  const hashed = await argon2.hash(parsed.data.newPassword, { type: argon2.argon2id });
  await prisma.$transaction([
    prisma.user.update({ where: { id: rec.userId }, data: { password: hashed } }),
    prisma.passwordResetToken.update({ where: { id: rec.id }, data: { usedAt: new Date() } }),
  ]);

  return NextResponse.json({ ok: true });
}
