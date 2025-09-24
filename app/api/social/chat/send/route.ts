export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { z } from 'zod';

const Schema = z.object({ room: z.string().min(1).max(64), body: z.string().min(1).max(500) });

export async function POST(req: NextRequest) {
  const me = await getUserFromRequest(req);
  const data = Schema.parse(await req.json());

  // 可加：是否被禁言 isMuted
  if (me.isMuted) return NextResponse.json({ ok: false, msg: 'Muted' }, { status: 403 });

  const msg = await prisma.chatMessage.create({
    data: { room: data.room, userId: me.id, body: data.body.trim(), type: 'USER' },
    include: { user: { select: { id: true, displayName: true, avatarUrl: true, headframe: true } } },
  });

  // 推播：你現行是 WS 或 SSE，這裡可寫入事件表，讓 stream 端讀取
  return NextResponse.json({ ok: true, message: msg });
}
