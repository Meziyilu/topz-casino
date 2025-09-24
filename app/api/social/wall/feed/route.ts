export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const me = await getUserFromRequest(req);
  const { searchParams } = new URL(req.url);
  const scope = (searchParams.get('scope') || 'following') as 'following' | 'global';
  const cursor = searchParams.get('cursor') || undefined;
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);

  let authorIds: string[] | undefined;
  if (scope === 'following') {
    const follows = await prisma.follow.findMany({ where: { followerId: me.id }, select: { followeeId: true } });
    authorIds = follows.map(f => f.followeeId).concat(me.id); // 自己也包含
  }

  const posts = await prisma.wallPost.findMany({
    where: {
      hidden: false,
      ...(authorIds ? { userId: { in: authorIds } } : {}),
    },
    include: {
      user: { select: { id: true, displayName: true, avatarUrl: true, headframe: true } },
      likes: { where: { userId: me.id }, select: { id: true } },
      _count: { select: { comments: true, likes: true } },
      medias: true,
    },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const nextCursor = posts.length > limit ? posts.pop()!.id : null;
  return NextResponse.json({ ok: true, items: posts, nextCursor });
}
