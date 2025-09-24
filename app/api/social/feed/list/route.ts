import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const me = await getUserFromRequest(req);
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 30);
    const cursor = searchParams.get('cursor'); // 格式: `${createdAtMs}_${postId}`

    let where: any = { hidden: false };
    let cursorCond: any = undefined;

    if (cursor) {
      const [ts, id] = cursor.split('_');
      cursorCond = {
        OR: [
          { createdAt: { lt: new Date(Number(ts)) } },
          { createdAt: new Date(Number(ts)), id: { lt: id } },
        ],
      };
    }

    const posts = await prisma.wallPost.findMany({
      where: { ...where, ...(cursorCond || {}) },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      select: {
        id: true,
        userId: true,
        body: true,
        imageUrl: true,
        createdAt: true,
        user: {
          select: {
            id: true, displayName: true, avatarUrl: true, vipTier: true, headframe: true, panelTint: true,
          },
        },
        medias: { select: { id: true, url: true, kind: true, meta: true } },
        _count: { select: { comments: true, likes: true } },
      },
    });

    const hasMore = posts.length > limit;
    const items = posts.slice(0, limit).map((p) => ({
      id: p.id,
      body: p.body,
      createdAt: p.createdAt,
      author: p.user,
      media: p.imageUrl ? [{ url: p.imageUrl, kind: 'image' }] : (p.medias || []),
      likes: p._count.likes,
      comments: p._count.comments,
    }));

    // 是否已按讚（登入才查）
    if (me?.id && items.length) {
      const ids = items.map(i => i.id);
      const mine = await prisma.wallLike.findMany({
        where: { userId: me.id, postId: { in: ids } },
        select: { postId: true },
      });
      const set = new Set(mine.map(m => m.postId));
      items.forEach(i => (i as any).liked = set.has(i.id));
    }

    const nextCursor = hasMore
      ? `${new Date(items[items.length - 1].createdAt).getTime()}_${items[items.length - 1].id}`
      : null;

    return NextResponse.json({ ok: true, items, nextCursor });
  } catch (e) {
    console.error('FEED_LIST', e);
    return NextResponse.json({ ok: false, error: 'INTERNAL' }, { status: 500 });
  }
}
