import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import dayjs from 'dayjs';

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  displayName: z.string().min(2).max(20).regex(/^[\u4e00-\u9fa5\w_]+$/),
  referralCode: z.string().optional(),
  isOver18: z.boolean(),
  acceptTOS: z.boolean(),
});

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const ct = req.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    return NextResponse.json({ message: 'Content-Type 必須為 application/json' }, { status: 415 });
  }

  const raw = await req.json();
  const parsed = RegisterSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ message: '參數錯誤' }, { status: 400 });
  }

  const { email, password, displayName, referralCode, isOver18, acceptTOS } = parsed.data;
  if (!isOver18 || !acceptTOS) {
    return NextResponse.json({ message: '需年滿18且同意條款' }, { status: 400 });
  }

  const exists = await prisma.user.findFirst({
    where: { OR: [{ email }, { displayName }] },
    select: { id: true, email: true, displayName: true },
  });
  if (exists) {
    return NextResponse.json({ message: 'Email 或 暱稱 已被使用' }, { status: 409 });
  }

  const refCodeSelf = crypto.randomBytes(4).toString('hex');
  const inviter = referralCode
    ? await prisma.user.findFirst({ where: { referralCode }, select: { id: true } })
    : null;

  const hash = await bcrypt.hash(password, 10);

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '0.0.0.0';

  const user = await prisma.user.create({
    data: {
      email,
      password: hash,
      displayName,
      referralCode: refCodeSelf,
      inviterId: inviter?.id ?? null,
      registeredIp: ip,
    },
    select: { id: true, email: true },
  });

  // 建立驗證信 token
  const token = crypto.randomBytes(16).toString('hex');
  await prisma.emailVerifyToken.upsert({
    where: { userId: user.id },
    update: {
      token,
      expiredAt: dayjs().add(1, 'day').toDate(),
      usedAt: null,
    },
    create: {
      userId: user.id,
      token,
      expiredAt: dayjs().add(1, 'day').toDate(),
    },
  });

  // 回傳驗證連結（或在此觸發寄信）
  const base = process.env.APP_URL || 'http://localhost:3000';
  const verifyUrl = `${base}/api/auth/verify?token=${token}`;

  return NextResponse.json({ ok: true, verifyUrl });
}
