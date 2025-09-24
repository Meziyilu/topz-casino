export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { z } from 'zod';

const Q = z.object({ userId: z.string().cuid() });

export async function POST(req: NextRequest) {
  const me = await getUserFromRequest(req);
  const { userId } = Q.parse(await req.json());

  // 雙向封鎖禁止
  const blocked = await prisma.userBlock.findFirst({
    where: { OR: [{ blockerId: me.id, blockedId: userId }, { blockerId: userId, blockedId: me.id }] },
  });
  if (blocked) return NextResponse.json({ ok: false, msg: 'Blocked' }, { status: 403 });

  // 查既有雙人線
  const existing = await prisma.directThread.findFirst({
    where: {
      participants: { every: { userId: { in: [me.id, userId] } } },
      // 兩人線：participants = 2，可額外加條件確保剛好兩人
    },
    include: { participants: true },
  });

  if (existing) return NextResponse.json({ ok: true, threadId: existing.id });

  const thread = await prisma.directThread.create({
    data: {
      participants: { create: [{ userId: me.id }, { userId }] },
    },
  });

  return NextResponse.json({ ok: true, threadId: thread.id });
}
