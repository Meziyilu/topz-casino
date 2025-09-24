// app/api/social/chat/send/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { z } from 'zod';

const Schema = z.object({
  room: z.string().min(1).max(64),
  body: z.string().min(1).max(500),
});

export async function POST(req: NextRequest) {
  const me = await getUserFromRequest(req);
  const data = Schema.parse(await req.json());

  // ✅ 不再讀 me.isMuted（AuthUser 沒這欄），改查 DB
  const meRow = await prisma.user.findUnique({
    where: { id: me.id },
    select: { isMuted: true },
  });
  if (meRow?.isMuted) {
    return NextResponse.json({ ok: false, msg: 'Muted' }, { status: 403 });
  }

  const msg = await prisma.chatMessage.create({
    data: {
      room: data.room,
      userId: me.id,
      body: data.body.trim(),
      type: 'USER',
    },
    include: {
      user: { select: { id: true, displayName: true, avatarUrl: true, headframe: true } },
    },
  });

  return NextResponse.json({ ok: true, message: msg });
}
