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

    await prisma.wallLike.deleteMany({ where: { postId, userId: me.id } });
    const cnt = await prisma.wallLike.count({ where: { postId } });
    return NextResponse.json({ ok: true, likes: cnt });
  } catch (e) {
    console.error('UNLIKE', e);
    return NextResponse.json({ ok: false, error: 'INTERNAL' }, { status: 500 });
  }
}
