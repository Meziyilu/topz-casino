export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { z } from 'zod';

const PostSchema = z.object({ postId: z.string().cuid(), body: z.string().min(1).max(500) });

export async function POST(req: NextRequest) {
  const me = await getUserFromRequest(req);
  const data = PostSchema.parse(await req.json());

  const post = await prisma.wallPost.findUnique({ where: { id: data.postId } });
  if (!post || post.hidden) return NextResponse.json({ ok: false, msg: 'Post not available' }, { status: 404 });

  const c = await prisma.wallComment.create({
    data: { postId: data.postId, userId: me.id, body: data.body.trim() },
  });
  return NextResponse.json({ ok: true, comment: c });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const postId = searchParams.get('postId') || '';
  if (!postId) return NextResponse.json({ ok: false, msg: 'postId required' }, { status: 400 });

  const cursor = searchParams.get('cursor') || undefined;
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);

  const rows = await prisma.wallComment.findMany({
    where: { postId, hidden: false },
    include: { user: { select: { id: true, displayName: true, avatarUrl: true } } },
    orderBy: { createdAt: 'asc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const nextCursor = rows.length > limit ? rows.pop()!.id : null;
  return NextResponse.json({ ok: true, items: rows, nextCursor });
}
