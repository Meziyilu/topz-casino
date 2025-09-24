export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const limit = Math.min(parseInt(new URL(req.url).searchParams.get('limit') || '20', 10), 50);

  const items = await prisma.user.findMany({
    where: { isBanned: false },
    select: { id: true, displayName: true, avatarUrl: true, headframe: true, publicSlug: true },
    orderBy: [{ vipTier: 'desc' }, { lastSeenAt: 'desc' }],
    take: limit,
  });

  return NextResponse.json({ ok: true, items });
}
