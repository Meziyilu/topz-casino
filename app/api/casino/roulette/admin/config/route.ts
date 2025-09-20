export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const Keys = [
  'RL_R30_DRAW_INTERVAL_SEC',
  'RL_R60_DRAW_INTERVAL_SEC',
  'RL_R90_DRAW_INTERVAL_SEC',
  'RL_LOCK_BEFORE_REVEAL_SEC',
  'RL_REVEAL_WINDOW_SEC',
] as const;

const PutBody = z.object({
  key: z.enum(Keys),
  valueInt: z.number().int().min(1).max(600),
});

export async function GET() {
  const rows = await prisma.gameConfig.findMany({
    where: { gameCode: 'ROULETTE' },
    orderBy: { key: 'asc' },
  });
  return NextResponse.json(rows);
}

export async function PUT(req: NextRequest) {
  try {
    // await verifyRequest(req)
    const body = await req.json();
    const parsed = PutBody.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'BAD_BODY' }, { status: 400 });

    const row = await prisma.gameConfig.upsert({
      where: { gameCode_key: { gameCode: 'ROULETTE', key: parsed.data.key } },
      create: { gameCode: 'ROULETTE', key: parsed.data.key, valueInt: parsed.data.valueInt },
      update: { valueInt: parsed.data.valueInt },
    });
    return NextResponse.json({ ok: true, row });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'CFG_FAIL' }, { status: 400 });
  }
}
