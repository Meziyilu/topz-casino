import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const me = await getUserFromRequest(req);
    if (!me?.id) return NextResponse.json({ ok: false }, { status: 401 });

    const { postId, body } = await req.json();
    const text = (body || '').trim();
    if (!postId || !text) return NextResponse.json({ ok: false, error: 'BAD' }, { status: 400 });
    if (text.length > 300) return NextResponse.json({ ok: false, error: 'TOO_LONG' }, { status: 400 });

    await prisma.wallComment.create({
      data: { postId, userId: me.id, body: text },
    });

    const cnt = await prisma.wallComment.count({ where: { postId } });
    return NextResponse.json({ ok: true, comments: cnt });
  } catch (e) {
    console.error('COMMENT', e);
    return NextResponse.json({ ok: false, error: 'INTERNAL' }, { status: 500 });
  }
}
