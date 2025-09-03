// app/api/auth/verify/resend/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/mailer';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return NextResponse.json({ ok: true }); // 不洩漏用戶存在與否

  const token = crypto.randomUUID().replace(/-/g, '');
  const expiredAt = new Date(Date.now() + 1000 * 60 * 60 * 24);

  await prisma.emailVerifyToken.upsert({
    where: { userId: user.id },
    update: { token, expiredAt, usedAt: null },
    create: { userId: user.id, token, expiredAt },
  });

  const base = process.env.APP_URL || `${req.nextUrl.protocol}//${req.nextUrl.host}`;
  const verifyUrl = `${base}/api/auth/verify?token=${token}`;

  const res = await sendEmail({
    to: email,
    subject: 'Topzcasino｜重寄驗證信',
    html: `<p>請點擊以下連結完成驗證：</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>`,
  });

  // DEV：直接把 verifyUrl 回傳給前端方便點擊
  return NextResponse.json({ ok: true, verifyUrl: (res as any).previewUrl || verifyUrl });
}
