import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseBody } from '@/lib/http';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

const ResetSchema = z.object({
  token: z.string().length(32),
  newPassword: z.string().min(6),
});

export async function POST(req: NextRequest) {
  try {
    const raw = await parseBody(req);
    const parsed = ResetSchema.safeParse(raw);
    if (!parsed.success) return NextResponse.json({ ok: false, code: 'INVALID_INPUT' }, { status: 400 });

    const { token, newPassword } = parsed.data;

    const rec = await prisma.passwordResetToken.findUnique({
      where: { token },
      select: { userId: true, expiredAt: true, usedAt: true },
    });
    if (!rec) return NextResponse.json({ ok: false, code: 'TOKEN_INVALID' }, { status: 400 });
    if (rec.usedAt) return NextResponse.json({ ok: false, code: 'TOKEN_USED' }, { status: 400 });
    if (rec.expiredAt < new Date()) return NextResponse.json({ ok: false, code: 'TOKEN_EXPIRED' }, { status: 400 });

    const hash = await bcrypt.hash(newPassword, 10);

    await prisma.$transaction([
      prisma.user.update({ where: { id: rec.userId }, data: { password: hash } }),
      prisma.passwordResetToken.update({ where: { token }, data: { usedAt: new Date() } }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[RESET_ERR]', err);
    return NextResponse.json({ ok: false, code: 'SERVER_ERROR' }, { status: 500 });
  }
}
