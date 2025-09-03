import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseBody } from '@/lib/http';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  displayName: z.string().min(2).max(20).regex(/^[\u4e00-\u9fa5A-Za-z0-9_]+$/),
  referralCode: z.string().optional(),
  isOver18: z.coerce.boolean(),
  acceptTOS: z.coerce.boolean(),
});

function genReferral() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export async function POST(req: NextRequest) {
  try {
    const raw = await parseBody(req);
    const parsed = RegisterSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, code: 'INVALID_INPUT', issues: parsed.error.issues }, { status: 400 });
    }
    const { email, password, displayName, referralCode, isOver18, acceptTOS } = parsed.data;
    if (!isOver18 || !acceptTOS) {
      return NextResponse.json({ ok: false, code: 'REQUIREMENTS_NOT_MET' }, { status: 400 });
    }

    const exists = await prisma.user.findFirst({
      where: { OR: [{ email }, { displayName }] },
      select: { id: true, email: true, displayName: true },
    });
    if (exists) {
      return NextResponse.json({ ok: false, code: 'DUPLICATE', message: 'Email 或暱稱已被使用' }, { status: 409 });
    }

    // 查詢邀請人（可選）
    let inviterId: string | undefined = undefined;
    if (referralCode) {
      const inviter = await prisma.user.findFirst({ where: { referralCode }, select: { id: true } });
      if (inviter) inviterId = inviter.id;
    }

    const pwdHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        email,
        password: pwdHash,
        displayName,
        referralCode: genReferral(),
        inviterId,
        registeredIp: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || null,
      },
      select: { id: true, email: true, displayName: true },
    });

    // 產生 Email 驗證 token（即使你現在先走 soft，也先建好）
    const token = crypto.randomBytes(16).toString('hex'); // 32字
    const expiredAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h
    await prisma.emailVerifyToken.upsert({
      where: { userId: newUser.id },
      update: { token, expiredAt, usedAt: null },
      create: { userId: newUser.id, token, expiredAt },
    });

    // 回傳驗證連結（之後你接 SMTP/郵件服務再真正寄）
    const verifyUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/auth/verify?token=${token}`;

    return NextResponse.json({ ok: true, user: newUser, verifyUrl });
  } catch (err) {
    console.error('[REGISTER_ERR]', err);
    return NextResponse.json({ ok: false, code: 'SERVER_ERROR' }, { status: 500 });
  }
}
