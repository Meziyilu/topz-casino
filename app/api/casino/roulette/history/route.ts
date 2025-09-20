export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const Q = z.object({
  room: z.enum(['RL_R30', 'RL_R60', 'RL_R90'] as const),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const parsed = Q.safeParse({
      room: searchParams.get('room') ?? 'RL_R30',
      limit: searchParams.get('limit') ?? '50',
    });
    if (!parsed.success) return NextResponse.json({ error: 'BAD_QUERY' }, { status: 400 });

    const rows = await prisma.rouletteRound.findMany({
      where: { room: parsed.data.room },
      orderBy: { startedAt: 'desc' },
      take: parsed.data.limit,
      select: { id: true, result: true, startedAt: true, endedAt: true },
    });

    return NextResponse.json(rows);
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'HISTORY_FAIL' }, { status: 400 });
  }
}
