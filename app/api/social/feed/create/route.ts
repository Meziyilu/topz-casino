import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const me = await getUserFromRequest(req);
    if (!me?.id) return NextResponse.json({ ok: false }, { status: 401 });

    const { body, imageUrl } = await req.json();
    const text = (body || '').trim();
    if (!text && !imageUrl) {
      return NextResponse.json({ ok: false, error: 'EMPTY' }, { status: 400 });
    }
    if (text.length > 1000) {
      return NextResponse.json({ ok: false, error: 'TOO_LONG' }, { status: 400 });
    }

    const post = await prisma.wallPost.create({
      data: {
        userId: me.id,
        body: text,
        imageUrl: imageUrl || null,
      },
      select: { id: true, createdAt: true },
    });

    return NextResponse.json({ ok: true, id: post.id, createdAt: post.createdAt });
  } catch (e) {
    console.error('FEED_CREATE', e);
    return NextResponse.json({ ok: false, error: 'INTERNAL' }, { status: 500 });
  }
}
