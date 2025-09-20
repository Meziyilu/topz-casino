export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
// import { verifyRequest } from '@/lib/jwt'; // 之後接權限

const Body = z.object({
  room: z.enum(['RL_R30', 'RL_R60', 'RL_R90'] as const),
});

export async function POST(req: NextRequest) {
  try {
    // await verifyRequest(req); // TODO: 管理權限
    const body = await req.json();
    const parsed = Body.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'BAD_BODY' }, { status: 400 });

    const round = await prisma.rouletteRound.create({
      data: { room: parsed.data.room, phase: 'BETTING' },
    });

    return NextResponse.json({ ok: true, roundId: round.id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'OPEN_FAIL' }, { status: 400 });
  }
}
