export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { z } from 'zod';

const PostSchema = z.object({
  threadId: z.string().cuid().optional(),
  toUserId: z.string().cuid().optional(),
  body: z.string().min(1).max(2000),
  kind: z.enum(['TEXT','SYSTEM','PAYOUT_NOTICE','POPUP_NOTICE']).optional(),
});

export async function GET(req: NextRequest) {
  const me = await getUserFromRequest(req);
  const { searchParams } = new URL(req.url);
  const threadId = searchParams.get('threadId') || '';
  const cursor = searchParams.get('cursor') || undefined;
  const limit = Math.min(parseInt(searchParams.get('limit') || '30', 10), 100);

  // 權限：必須是參與者
  const p = await prisma.directParticipant.findFirst({ where: { threadId, userId: me.id } });
  if (!p) return NextResponse.json({ ok: false, msg: 'Forbidden' }, { status: 403 });

  const items = await prisma.directMessage.findMany({
    where: { threadId },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const nextCursor = items.length > limit ? items.pop()!.id : null;
  return NextResponse.json({ ok: true, items: items.reverse(), nextCursor });
}

export async function POST(req: NextRequest) {
  const me = await getUserFromRequest(req);
  const payload = PostSchema.parse(await req.json());

  // 開新線或用 threadId
  let threadId = payload.threadId;
  if (!threadId) {
    if (!payload.toUserId) return NextResponse.json({ ok: false, msg: 'toUserId required' }, { status: 400 });
    // 禁止封鎖
    const blocked = await prisma.userBlock.findFirst({ where: { OR: [{ blockerId: me.id, blockedId: payload.toUserId }, { blockerId: payload.toUserId, blockedId: me.id }] } });
    if (blocked) return NextResponse.json({ ok: false, msg: 'Blocked' }, { status: 403 });

    const t = await prisma.directThread.create({ data: { participants: { create: [{ userId: me.id }, { userId: payload.toUserId }] } } });
    threadId = t.id;
  } else {
    const p = await prisma.directParticipant.findFirst({ where: { threadId, userId: me.id } });
    if (!p) return NextResponse.json({ ok: false, msg: 'Forbidden' }, { status: 403 });
  }

  const msg = await prisma.directMessage.create({
    data: { threadId, senderId: me.id, body: payload.body.trim(), kind: payload.kind ?? 'TEXT' },
  });

  // 可在此發 Notification（略）
  return NextResponse.json({ ok: true, message: msg });
}
