import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // 可不登入瀏覽
    await getUserFromRequest(req);
    const { searchParams } = new URL(req.url);
    const postId = searchParams.get('postId') || '';
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);
    const cursor = searchParams.get('cursor'); // `${createdAtMs}_${id}` 往舊的抓

    if (!postId) return NextResponse.json({ ok: false, error: 'BAD' }, { status: 400 });

    let cond: any = { postId, hidden: false };
    if (cursor) {
      const [ts, id] = cursor.split('_');
      cond = {
        ...cond,
        OR: [
          { createdAt: { lt: new Date(Number(ts)) } },
          { createdAt: new Date(Number(ts)), id: { lt: id } },
        ],
      };
    }

    const rows = await prisma.wallComment.findMany({
      where: cond,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      select: {
        id: true, userId: true, body: true, createdAt: true,
        user: { select: { id: true, displayName: true, avatarUrl: true, vipTier: true } },
      },
    });

    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit).reverse(); // 前端由舊到新

    const nextCursor = hasMore
      ? `${new Date(items[0].createdAt).getTime()}_${items[0].id}`
      : null;

    return NextResponse.json({ ok: true, items, nextCursor });
  } catch (e) {
    console.error('COMMENTS_LIST', e);
    return NextResponse.json({ ok: false, error: 'INTERNAL' }, { status: 500 });
  }
}
