export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId') || '';
  const tab = (searchParams.get('tab') || 'following') as 'following' | 'followers';
  const cursor = searchParams.get('cursor') || undefined;
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);

  if (!userId) return NextResponse.json({ ok: false, error: 'userId required' }, { status: 400 });

  if (tab === 'following') {
    const rows = await prisma.follow.findMany({
      where: { followerId: userId },
      include: { followee: { select: { id: true, displayName: true, avatarUrl: true, headframe: true, publicSlug: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const nextCursor = rows.length > limit ? rows.pop()!.id : null;
    return NextResponse.json({
      ok: true,
      items: rows.map(r => r.followee),
      nextCursor,
    });
  } else {
    const rows = await prisma.follow.findMany({
      where: { followeeId: userId },
      include: { follower: { select: { id: true, displayName: true, avatarUrl: true, headframe: true, publicSlug: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const nextCursor = rows.length > limit ? rows.pop()!.id : null;
    return NextResponse.json({
      ok: true,
      items: rows.map(r => r.follower),
      nextCursor,
    });
  }
}
