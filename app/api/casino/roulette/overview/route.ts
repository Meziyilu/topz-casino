export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserFromRequest } from '@/lib/auth';
import { getOverview } from '@/services/roulette.service';

const Q = z.object({
  room: z.enum(['RL_R30','RL_R60','RL_R90'] as const),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const parsed = Q.safeParse({ room: searchParams.get('room') ?? 'RL_R30' });
    if (!parsed.success) return NextResponse.json({ error: 'BAD_QUERY' }, { status: 400 });

    const me = await getUserFromRequest(req).catch(() => null);
    const data = await getOverview(parsed.data.room, me?.id);
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'OVERVIEW_FAIL' }, { status: 500 });
  }
}
