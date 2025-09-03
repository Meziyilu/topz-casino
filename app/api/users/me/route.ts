// app/api/users/me/route.ts
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function GET() {
  const tk = cookies().get('token')?.value;
  const payload = tk ? verifyToken<{ sub: string; typ: string }>(tk) : null;
  if (!payload || payload.typ !== 'access') {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: {
      id: true, email: true, displayName: true, avatarUrl: true,
      isAdmin: true, headframe: true, panelStyle: true, vipTier: true,
    },
  });
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  return NextResponse.json({ ok: true, user });
}
