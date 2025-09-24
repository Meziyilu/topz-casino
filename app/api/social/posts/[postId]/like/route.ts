import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

export async function POST(req: NextRequest, { params }: { params: { postId: string } }) {
  try {
    const me = await getUserFromRequest(req);
    if (!me?.id) return NextResponse.json({ ok: false }, { status: 401 });

    const postId = params.postId;

    const existing = await prisma.wallLike.findUnique({
      where: { postId_userId: { postId, userId: me.id } },
    });

    if (existing) {
      await prisma.wallLike.delete({ where: { id: existing.id } });
      return NextResponse.json({ ok: true, liked: false });
    } else {
      await prisma.wallLike.create({ data: { postId, userId: me.id } });
      return NextResponse.json({ ok: true, liked: true });
    }
  } catch (e) {
    console.error('POST_LIKE', e);
    return NextResponse.json({ ok: false, error: 'INTERNAL' }, { status: 500 });
  }
}
