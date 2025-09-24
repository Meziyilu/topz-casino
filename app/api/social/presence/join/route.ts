export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { z } from 'zod';

const Schema = z.object({
  gameCode: z.enum(['GLOBAL','BACCARAT','LOTTO','SICBO','ROULETTE','HORSE','FIVE_MINUTE','SLOTS','BLACKJACK']),
  roomKey: z.string().min(1),
  seatNo: z.number().int().optional(),
  seatMeta: z.any().optional(),
});

export async function POST(req: NextRequest) {
  const me = await getUserFromRequest(req);
  const data = Schema.parse(await req.json());

  await prisma.roomPresence.create({
    data: {
      userId: me.id,
      gameCode: data.gameCode,
      roomKey: data.roomKey,
      seatNo: data.seatNo,
      seatMeta: data.seatMeta,
    },
  });

  return NextResponse.json({ ok: true });
}
