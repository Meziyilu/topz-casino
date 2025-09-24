export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { z } from 'zod';

const PostSchema = z.object({ followeeId: z.string().cuid() });

export async function POST(req: NextRequest) {
  const me = await getUserFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { followeeId } = PostSchema.parse(body);

  if (me.id === followeeId) return NextResponse.json({ ok: false, msg: 'Cannot follow yourself' }, { status: 400 });

  // 禁止對已封鎖的對象建立追蹤
  const blocked = await prisma.userBlock.findFirst({
    where: {
      OR: [
        { blockerId: me.id, blockedId: followeeId },
        { blockerId: followeeId, blockedId: me.id },
      ],
    },
  });
  if (blocked) return NextResponse.json({ ok: false, msg: 'Blocked relation' }, { status: 403 });

  await prisma.follow.upsert({
    where: { followerId_followeeId: { followerId: me.id, followeeId } },
    create: { followerId: me.id, followeeId },
    update: {},
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const me = await getUserFromRequest(req);
  const { searchParams } = new URL(req.url);
  const followeeId = searchParams.get('followeeId') || '';
  if (!followeeId) return NextResponse.json({ ok: false, msg: 'followeeId required' }, { status: 400 });

  await prisma.follow.deleteMany({ where: { followerId: me.id, followeeId } });
  return NextResponse.json({ ok: true });
}
