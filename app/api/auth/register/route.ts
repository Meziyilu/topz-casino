import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { parseFormData } from '@/lib/form';

function randomCode(len = 8) {
  const dict = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < len; i++) out += dict[Math.floor(Math.random() * dict.length)];
  return out;
}

export async function POST(req: NextRequest) {
  try {
    const isJson = req.headers.get('content-type')?.includes('application/json');
    const raw = isJson ? await req.json() : await parseFormData(req);

    const email = String((raw as any).email || '').trim().toLowerCase();
    const password = String((raw as any).password || '');
    const displayName = String((raw as any).displayName || '').trim();
    const referralCodeInput = String((raw as any).referralCode || '').trim();
    const isOver18 = String((raw as any).isOver18 || '') === 'true';
    const acceptTOS = String((raw as any).acceptTOS || '') === 'true';

    if (!email || !password || !displayName) {
      return NextResponse.json({ ok: false, error: 'MISSING_FIELDS' }, { status: 400 });
    }
    if (!isOver18 || !acceptTOS) {
      return NextResponse.json({ ok: false, error: 'MUST_ACCEPT' }, { status: 400 });
    }

    const exists = await prisma.user.findFirst({
      where: { OR: [{ email }, { displayName }] },
      select: { id: true },
    });
    if (exists) {
      return NextResponse.json({ ok: false, error: 'EMAIL_OR_NAME_TAKEN' }, { status: 409 });
    }

    const inviter = referralCodeInput
      ? await prisma.user.findFirst({ where: { referralCode: referralCodeInput }, select: { id: true } })
      : null;

    const hashed = await bcrypt.hash(password, 10);
    const selfReferral = randomCode(8);
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.ip || '';

    await prisma.user.create({
      data: {
        email,
        password: hashed,
        displayName,
        referralCode: selfReferral,
        inviterId: inviter?.id ?? null,
        registeredIp: ip,
        emailVerifiedAt: new Date(), // ← 直接當作已驗證
      },
    });

    // 不再建立 EmailVerifyToken
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('REGISTER_ERROR', e);
    return NextResponse.json({ ok: false, error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
