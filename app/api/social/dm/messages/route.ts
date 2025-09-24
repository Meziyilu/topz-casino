import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const me = await getUserFromRequest(req);
    if (!me?.id) return NextResponse.json({ ok: false }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const threadId = searchParams.get('threadId') || '';
    const limit = Math.min(parseInt(searchParams.get('limit') || '30', 10), 50);
    const cursor = searchParams.get('cursor'); // `${createdAtMs}_${messageId}`

    // 權限：必須是參與者
    const part = await prisma.directParticipant.findFirst({ where: { threadId, userId: me.id } });
    if (!part) return NextResponse.json({ ok: false, error: 'FORBIDDEN' }, { status: 403 });

    let cond: any = {};
    if (cursor) {
      const [ts, mid] = cursor.split('_');
      cond = {
        OR: [
          { createdAt: { lt: new Date(Number(ts)) } },
          { createdAt: new Date(Number(ts)), id: { lt: mid } },
        ],
      };
    }

    const msgs = await prisma.directMessage.findMany({
      where: { threadId, ...(cursor ? cond : {}) },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      select: { id: true, senderId: true, kind: true, body: true, meta: true, createdAt: true },
    });

    const hasMore = msgs.length > limit;
    const items = msgs.slice(0, limit).reverse(); // 前端從舊到新顯示

    const nextCursor = hasMore
      ? `${new Date(items[0].createdAt).getTime()}_${items[0].id}`
      : null;

    return NextResponse.json({ ok: true, items, nextCursor });
  } catch (e) {
    console.error('DM_MESSAGES', e);
    return NextResponse.json({ ok: false, error: 'INTERNAL' }, { status: 500 });
  }
}
