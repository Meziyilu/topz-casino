import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const me = await getUserFromRequest(req);
    if (!me?.id) return NextResponse.json({ ok: false }, { status: 401 });

    const { postId } = await req.json();
    if (!postId) return NextResponse.json({ ok: false, error: 'BAD' }, { status: 400 });

    const post = await prisma.wallPost.findUnique({ where: { id: postId }, select: { userId: true } });
    if (!post) return NextResponse.json({ ok: false }, { status: 404 });

    if (post.userId !== me.id && !me.isAdmin) {
      return NextResponse.json({ ok: false, error: 'FORBIDDEN' }, { status: 403 });
    }

    await prisma.wallPost.update({ where: { id: postId }, data: { hidden: true } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('FEED_DELETE', e);
    return NextResponse.json({ ok: false, error: 'INTERNAL' }, { status: 500 });
  }
}
