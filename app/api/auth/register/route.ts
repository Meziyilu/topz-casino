import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { RegisterSchema } from '@/lib/validation';
import { hashPassword, getClientIp } from '@/lib/auth';
import crypto from 'crypto';

function makeReferralCode(len = 8) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: len }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
}
function makeTokenHex32() {
  return crypto.randomBytes(16).toString('hex'); // 32 hex chars
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, displayName, referralCode, isOver18, acceptTOS } = RegisterSchema.parse(body);

    // Unique checks
    const [emailTaken, nameTaken] = await Promise.all([
      prisma.user.findUnique({ where: { email } }),
      prisma.user.findUnique({ where: { displayName } }),
    ]);
    if (emailTaken) return NextResponse.json({ error: 'EMAIL_TAKEN' }, { status: 409 });
    if (nameTaken) return NextResponse.json({ error: 'DISPLAY_NAME_TAKEN' }, { status: 409 });

    // inviter（可選）
    let inviterId: string | undefined;
    if (referralCode) {
      const inviter = await prisma.user.findFirst({ where: { referralCode } });
      if (!inviter) return NextResponse.json({ error: 'INVALID_REFERRAL' }, { status: 400 });
      inviterId = inviter.id;
    }

    const passHash = await hashPassword(password);
    const myReferral = makeReferralCode(8);
    const ip = getClientIp(req);

    const user = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          email,
          password: passHash,
          displayName,
          referralCode: myReferral,
          inviterId,
          registeredIp: ip,
        },
        select: { id: true },
      });

      const token = makeTokenHex32();
      const expiredAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await tx.emailVerifyToken.create({
        data: { userId: u.id, token, expiredAt },
      });

      return { id: u.id, token };
    });

    const base = process.env.APP_BASE_URL ?? 'http://localhost:3000';
    const verifyUrl = `${base}/api/auth/verify?token=${user.token}`;
    return NextResponse.json({ userId: user.id, verifyUrl });
  } catch (err: any) {
    if (err.name === 'ZodError') return NextResponse.json({ error: 'INVALID_INPUT', details: err.issues }, { status: 400 });
    console.error('register error', err);
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
