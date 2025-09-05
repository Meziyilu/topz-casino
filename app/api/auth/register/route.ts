// app/api/auth/register/route.ts
export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

function makeReferralCode(len = 8) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: len }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
}

export async function POST(req: NextRequest) {
  try {
    const isJson = req.headers.get('content-type')?.includes('application/json');
    const body = isJson ? await req.json() : Object.fromEntries(await req.formData());
    const email = String((body as any).email || '').trim().toLowerCase();
    const displayName = String((body as any).displayName || '').trim();
    const password = String((body as any).password || '');
    const referralCode = String((body as any).referralCode || '').trim();

    if (!email || !password || !displayName) {
      return NextResponse.json({ ok: false, error: 'MISSING_FIELDS' }, { status: 400 });
    }

    const dup = await prisma.user.findFirst({ where: { OR: [{ email }, { displayName }] } });
    if (dup) return NextResponse.json({ ok: false, error: 'DUPLICATE' }, { status: 409 });

    const hashed = await bcrypt.hash(password, 10);

    let inviterId: string | undefined = undefined;
    if (referralCode) {
      const inviter = await prisma.user.findFirst({ where: { referralCode } });
      if (inviter) inviterId = inviter.id;
    }

    await prisma.user.create({
      data: {
        email,
        password: hashed,
        displayName,
        referralCode: makeReferralCode(),
        inviterId,
        emailVerifiedAt: new Date(), // 不做信箱驗證，直接標記已驗證
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('REGISTER_ERROR', e);
    return NextResponse.json({ ok: false, error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
