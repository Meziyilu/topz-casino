export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { z } from 'zod';

const Schema = z.object({
  gameCode: z.enum(['GLOBAL','BACCARAT','LOTTO','SICBO','ROULETTE','HORSE','FIVE_MINUTE','SLOTS','BLACKJACK']),
  roomKey: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const me = await getUserFromRequest(req);
  const { gameCode, roomKey } = Schema.parse(await req.json());
  await prisma.roomPresence.updateMany({
    where: { userId: me.id, gameCode: gameCode as any, roomKey, leftAt: null },
    data: { leftAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
