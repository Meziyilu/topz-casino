import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { verifyAccess } from '@/lib/auth';

export async function GET(_req: NextRequest) {
  try {
    const token = cookies().get('token')?.value;
    if (!token) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    const payload = verifyAccess(token);
    if (payload.typ !== 'access') return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    const u = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true, email: true, displayName: true, avatarUrl: true, isAdmin: true,
        vipTier: true, balance: true, bankBalance: true,
      },
    });
    if (!u) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    return NextResponse.json(u);
  } catch {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }
}
