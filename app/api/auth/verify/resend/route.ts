import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseBody } from '@/lib/http';
import { z } from 'zod';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const ResendSchema = z.object({
  email: z.string().email(),
});

const COOLDOWN_MS = 60 * 1000; // 60 秒
const DEFAULT_BASE = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

export async function POST(req: NextRequest) {
  try {
    const raw = await parseBody(req);
    const parsed = ResendSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, code: 'INVALID_INPUT' }, { status: 400 });
    }

    const { email } = parsed.data;

    // 找使用者
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, emailVerifiedAt: true },
    });

    // 為了不暴露帳號是否存在，若不存在也回 ok:true
    if (!user) return NextResponse.json({ ok: true });

    // 已驗證就直接回 ok:true（前端可提示「已驗證，請直接登入」）
    if (user.emailVerifiedAt) return NextResponse.json({ ok: true });

    // 取目前 token（若有）
    const curr = await prisma.emailVerifyToken.findUnique({
      where: { userId: user.id },
      select: { token: true, createdAt: true, expiredAt: true, usedAt: true },
    });

    const now = Date.now();

    // 節流：60 秒內不得重寄
    if (curr && now - new Date(curr.createdAt).getTime() < COOLDOWN_MS) {
      const remain = Math.ceil((COOLDOWN_MS - (now - new Date(curr.createdAt).getTime())) / 1000);
      return NextResponse.json({ ok: false, code: 'TOO_FREQUENT', retryAfter: remain }, { status: 429 });
    }

    // 產/旋轉 token（未使用且未過期可重用，但通常選擇旋轉較安全）
    const token = crypto.randomBytes(16).toString('hex'); // 32字
    const expiredAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h

    await prisma.emailVerifyToken.upsert({
      where: { userId: user.id },
      update: { token, expiredAt, usedAt: null, createdAt: new Date() },
      create: { userId: user.id, token, expiredAt },
    });

    const verifyUrl = `${DEFAULT_BASE}/api/auth/verify?token=${token}`;

    // 這裡原則上應該「送信」，你現階段先回連結即可
    return NextResponse.json({ ok: true, verifyUrl });
  } catch (err) {
    console.error('[VERIFY_RESEND_ERR]', err);
    return NextResponse.json({ ok: false, code: 'SERVER_ERROR' }, { status: 500 });
  }
}
