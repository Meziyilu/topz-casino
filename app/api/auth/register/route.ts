// app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { parseFormData } from '@/lib/form';
import { signAccess, signRefresh, setAuthCookies } from '@/lib/auth';

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(64),
  displayName: z.string().min(2).max(20),
  referralCode: z.string().optional(),
  isOver18: z.coerce.boolean().optional(),
  acceptTOS: z.coerce.boolean().optional(),
});

function makeReferralCode(len = 8) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: len }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
}

export async function POST(req: NextRequest) {
  try {
    const isJson = req.headers.get('content-type')?.includes('application/json');
    const raw = isJson ? await req.json() : await parseFormData(req);
    const parsed = RegisterSchema.safeParse(raw);
    if (!parsed.success) return NextResponse.json({ ok: false, error: 'INVALID_INPUT' }, { status: 400 });

    const { email, password, displayName, referralCode } = parsed.data;
    const lower = email.trim().toLowerCase();

    const [existsEmail, existsName] = await Promise.all([
      prisma.user.findUnique({ where: { email: lower } }),
      prisma.user.findFirst({ where: { displayName } }),
    ]);
    if (existsEmail) return NextResponse.json({ ok: false, error: 'EMAIL_TAKEN' }, { status: 409 });
    if (existsName) return NextResponse.json({ ok: false, error: 'DISPLAYNAME_TAKEN' }, { status: 409 });

    const hash = await bcrypt.hash(password, 10);
    const inviter = referralCode ? await prisma.user.findFirst({ where: { referralCode } }) : null;

    const user = await prisma.user.create({
      data: {
        email: lower,
        password: hash,
        displayName,
        name: displayName,
        referralCode: makeReferralCode(),
        inviterId: inviter?.id ?? null,
        // 你要求：不需要 email 驗證；可預設成已驗證或留空，這裡留空也不影響登入
      },
    });

    // 直接登入（發 token）
    const access = signAccess({ uid: user.id, isAdmin: user.isAdmin, typ: 'access' as const });
    const refresh = signRefresh({ uid: user.id, typ: 'refresh' as const });

    const res = NextResponse.json({ ok: true });
    setAuthCookies(res, access, refresh);
    return res;
  } catch (e) {
    console.error('REGISTER_ERROR', e);
    return NextResponse.json({ ok: false, error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
