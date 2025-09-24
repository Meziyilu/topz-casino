import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const me = await getUserFromRequest(req);
    if (!me?.id || !me.isAdmin) return NextResponse.json({ ok: false }, { status: 403 });

    const { postId, hidden = true } = await req.json();
    if (!postId) return NextResponse.json({ ok: false }, { status: 400 });

    await prisma.wallPost.update({ where: { id: postId }, data: { hidden: !!hidden } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('ADMIN_FEED_HIDE', e);
    return NextResponse.json({ ok: false, error: 'INTERNAL' }, { status: 500 });
  }
}
