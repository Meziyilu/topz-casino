// app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { sendEmail } from '@/lib/mailer';

export const dynamic = 'force-dynamic'; // ← 避免 build 時靜態分析錯誤

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  displayName: z.string().min(2).max(20),
  referralCode: z.string().optional(),
  isOver18: z.coerce.boolean(),
  acceptTOS: z.coerce.boolean(),
});

export async function POST(req: NextRequest) {
  const raw = await req.json();
  const parsed = RegisterSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
  const { email, password, displayName, referralCode } = parsed.data;

  // 檢查唯一性
  const exists = await prisma.user.findFirst({ where: { OR: [{ email }, { displayName }] } });
  if (exists) return NextResponse.json({ ok: false, code: 'DUPLICATE' }, { status: 409 });

  const hash = await bcrypt.hash(password, 10);
  const inviter = referralCode
    ? await prisma.user.findFirst({ where: { referralCode } })
    : null;

  const newUser = await prisma.user.create({
    data: {
      email,
      password: hash,
      displayName,
      inviterId: inviter?.id ?? null,
      referralCode: crypto.randomUUID().replace(/-/g, '').slice(0, 10),
      registeredIp: req.headers.get('x-forwarded-for') ?? req.ip ?? null,
    },
  });

  // 產生驗證 token
  const token = crypto.randomUUID().replace(/-/g, '');
  const expiredAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h
  await prisma.emailVerifyToken.upsert({
    where: { userId: newUser.id },
    update: { token, expiredAt, usedAt: null },
    create: { userId: newUser.id, token, expiredAt },
  });

  const base = process.env.APP_URL || `${req.nextUrl.protocol}//${req.nextUrl.host}`;
  const verifyUrl = `${base}/api/auth/verify?token=${token}`;

  // DEV 模式：不真的寄，回傳 verifyUrl
  await sendEmail({
    to: email,
    subject: 'Topzcasino｜請完成信箱驗證',
    html: `<p>請點擊以下連結完成驗證：</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>`,
  });

  return NextResponse.json({ ok: true, verifyUrl });
}
