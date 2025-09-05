// app/api/auth/register/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const isJson = req.headers.get('content-type')?.includes('application/json');
    const raw = isJson ? await req.json() : Object.fromEntries((await req.formData()).entries());
    const email = String(raw.email || '').trim().toLowerCase();
    const password = String(raw.password || '');
    const displayName = String(raw.displayName || '').trim();
    const referralCode = raw.referralCode ? String(raw.referralCode).trim() : undefined;

    if (!email || !password || !displayName) {
      return NextResponse.json({ ok: false, error: 'MISSING_FIELDS' }, { status: 400 });
    }

    const existed = await prisma.user.findFirst({
      where: { OR: [{ email }, { displayName }] },
      select: { id: true },
    });
    if (existed) {
      return NextResponse.json({ ok: false, error: 'EMAIL_OR_NAME_TAKEN' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);     // ✅ 統一用 bcrypt
    // 你原本有 referralCode 自動產生邏輯可保留；這裡簡化
    const user = await prisma.user.create({
      data: {
        email,
        password: passwordHash,
        displayName,
        referralCode: referralCode || Math.random().toString(36).slice(2, 10).toUpperCase(),
        // 不做 email 驗證：可不填 emailVerifiedAt
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, userId: user.id });
  } catch (e) {
    console.error('REGISTER_ERROR', e);
    return NextResponse.json({ ok: false, error: 'INTERNAL' }, { status: 500 });
  }
}
