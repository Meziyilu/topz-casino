export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);

  if (!q) return NextResponse.json({ ok: true, items: [] });

  const items = await prisma.user.findMany({
    where: {
      OR: [
        { displayName: { contains: q, mode: 'insensitive' } },
        { nickname: { contains: q, mode: 'insensitive' } },
        { publicSlug: { contains: q, mode: 'insensitive' } },
      ],
      isBanned: false,
    },
    select: { id: true, displayName: true, avatarUrl: true, headframe: true, publicSlug: true },
    orderBy: [{ vipTier: 'desc' }, { lastSeenAt: 'desc' }],
    take: limit,
  });

  return NextResponse.json({ ok: true, items });
}
