import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { parseFormData } from '@/lib/form';
import { randomBytes } from 'crypto';

function genReferral() {
  return randomBytes(4).toString('hex'); // 8字元
}

export async function POST(req: NextRequest) {
  try {
    const isJson = req.headers.get('content-type')?.includes('application/json');
    const body = isJson ? await req.json() : await parseFormData(req);

    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const displayName = String(body.displayName || '').trim();
    const referralCode = String(body.referralCode || '').trim() || undefined;

    if (!email || !password || !displayName) {
      return NextResponse.json({ ok: false, error: 'MISSING_FIELDS' }, { status: 400 });
    }

    const exists = await prisma.user.findFirst({
      where: { OR: [{ email }, { displayName }] },
      select: { id: true, email: true, displayName: true },
    });
    if (exists) {
      return NextResponse.json({ ok: false, error: 'DUPLICATE_EMAIL_OR_NAME' }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashed,
        displayName,
        referralCode: genReferral(),
        // 如果你有 inviter 邏輯，可在這裡處理 referralCode -> inviterId
      },
      select: { id: true, email: true, displayName: true },
    });

    // 你目前沒有真發信，先不強制 email 驗證
    // 若要做，這裡建立 EmailVerifyToken，回傳 verifyUrl
    // const token = randomBytes(32).toString('hex');
    // const expiredAt = new Date(Date.now() + 1000 * 60 * 30);
    // await prisma.emailVerifyToken.create({ data: { userId: user.id, token, expiredAt } });

    return NextResponse.json({ ok: true, user });
  } catch (err) {
    console.error('REGISTER_ERROR', err);
    return NextResponse.json({ ok: false, error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
