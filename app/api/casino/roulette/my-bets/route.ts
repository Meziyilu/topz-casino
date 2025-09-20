export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

const Q = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

export async function GET(req: NextRequest) {
  try {
    const me = await getUserFromRequest(req);
    const { searchParams } = new URL(req.url);
    const parsed = Q.safeParse({ limit: searchParams.get('limit') ?? '30' });
    if (!parsed.success) return NextResponse.json({ error: 'BAD_QUERY' }, { status: 400 });

    const rows = await prisma.rouletteBet.findMany({
      where: { userId: me.id },
      orderBy: { createdAt: 'desc' },
      take: parsed.data.limit,
      include: { round: true },
    });

    return NextResponse.json(rows);
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'MY_BETS_FAIL' }, { status: 400 });
  }
}
