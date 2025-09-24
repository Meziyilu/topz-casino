import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const me = await getUserFromRequest(req);
    if (!me?.id) return NextResponse.json({ ok: false }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const scope = (searchParams.get('scope') || 'FOLLOWING').toUpperCase();
    const limit = Math.min(Number(searchParams.get('limit') || 20), 50);

    // 取追蹤名單
    let where: any = { hidden: false };
    if (scope === 'FOLLOWING') {
      const follows = await prisma.follow.findMany({
        where: { followerId: me.id },
        select: { followeeId: true },
      });
      const ids = follows.map((f) => f.followeeId);
      if (ids.length === 0) return NextResponse.json({ ok: true, items: [] });
      where.userId = { in: ids };
    }

    const posts = await prisma.wallPost.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: { select: { id: true, displayName: true, avatarUrl: true, vipTier: true } },
        likes: { where: { userId: me.id }, select: { id: true } },
        _count: { select: { likes: true, comments: true } },
      },
    });

    const items = posts.map((p) => ({
      id: p.id,
      user: p.user,
      body: p.body,
      imageUrl: p.imageUrl || null,
      createdAt: p.createdAt,
      liked: p.likes.length > 0,
      likeCount: p._count.likes,
      commentCount: p._count.comments,
    }));

    return NextResponse.json({ ok: true, items });
  } catch (e) {
    console.error('FEED_GET', e);
    return NextResponse.json({ ok: false, error: 'INTERNAL' }, { status: 500 });
  }
}
