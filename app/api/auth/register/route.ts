// app/api/auth/register/route.ts
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import argon2 from 'argon2';
import crypto from 'node:crypto';

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(2).max(20).regex(/^[\u4e00-\u9fa5\w_]+$/),
  referralCode: z.string().optional(),
  isOver18: z.coerce.boolean(),
  acceptTOS: z.coerce.boolean(),
});

function makeReferralCode() {
  return crypto.randomBytes(4).toString('hex'); // 8字元
}
function makeToken32() {
  return crypto.randomBytes(16).toString('hex'); // 32字
}
function getBaseUrl(req: NextRequest) {
  return process.env.APP_URL ?? `${req.nextUrl.protocol}//${req.headers.get('host')}`;
}

export async function POST(req: NextRequest) {
  const isJson = req.headers.get('content-type')?.includes('application/json');
  const raw = isJson ? await req.json() : Object.fromEntries(await req.formData());
  const parsed = RegisterSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, errors: parsed.error.flatten() }, { status: 400 });
  }
  const { email, password, displayName, referralCode, isOver18, acceptTOS } = parsed.data;
  if (!isOver18 || !acceptTOS) {
    return NextResponse.json({ ok: false, message: '請勾選已滿18歲並同意服務條款' }, { status: 400 });
  }

  // 唯一性檢查
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { displayName }] },
    select: { id: true, email: true, displayName: true },
  });
  if (existing) {
    return NextResponse.json({ ok: false, message: 'Email 或暱稱已被使用' }, { status: 409 });
  }

  const hashed = await argon2.hash(password, { type: argon2.argon2id });
  const inviter = referralCode
    ? await prisma.user.findFirst({ where: { referralCode }, select: { id: true } })
    : null;

  const user = await prisma.user.create({
    data: {
      email,
      password: hashed,
      displayName,
      balance: 0,
      bankBalance: 0,
      referralCode: makeReferralCode(),
      inviterId: inviter?.id ?? null,
      registeredIp: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.ip ?? undefined,
    },
    select: { id: true },
  });

  // 建立驗證 token（24h）
  const token = makeToken32();
  const expiredAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await prisma.emailVerifyToken.create({
    data: { userId: user.id, token, expiredAt },
  });

  const verifyUrl = `${getBaseUrl(req)}/api/auth/verify?token=${token}`;
  return NextResponse.json({ ok: true, verifyUrl }, { status: 201 });
}
