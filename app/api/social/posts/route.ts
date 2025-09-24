import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const me = await getUserFromRequest(req);
    if (!me?.id) return NextResponse.json({ ok: false }, { status: 401 });

    const { body, imageUrl } = await req.json();
    const text = (body || '').toString().trim();
    if (!text && !imageUrl) {
      return NextResponse.json({ ok: false, error: 'EMPTY' }, { status: 400 });
    }

    const post = await prisma.wallPost.create({
      data: {
        userId: me.id,
        body: text,
        imageUrl: imageUrl || null,
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, id: post.id });
  } catch (e) {
    console.error('POST_CREATE', e);
    return NextResponse.json({ ok: false, error: 'INTERNAL' }, { status: 500 });
  }
}
