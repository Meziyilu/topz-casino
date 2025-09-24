export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const me = await getUserFromRequest(req);
  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get('cursor') || undefined;
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);

  const rows = await prisma.profileVisit.findMany({
    where: { profileUserId: me.id },
    include: { viewerUser: { select: { id: true, displayName: true, avatarUrl: true, headframe: true, publicSlug: true } } },
    orderBy: { visitedAt: 'desc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const nextCursor = rows.length > limit ? rows.pop()!.id : null;
  return NextResponse.json({
    ok: true,
    items: rows.map(r => ({ id: r.id, visitedAt: r.visitedAt, viewer: r.viewerUser })),
    nextCursor,
  });
}
