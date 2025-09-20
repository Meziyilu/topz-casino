export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserFromRequest } from '@/lib/auth';
import { placeBet } from '@/services/roulette.service';

const Body = z.object({
  room: z.enum(['RL_R30', 'RL_R60', 'RL_R90'] as const),
  kind: z.string().trim(),
  amount: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  try {
    const me = await getUserFromRequest(req);
    const body = await req.json();
    const parsed = Body.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'BAD_BODY' }, { status: 400 });

    const out = await placeBet({
      userId: me.id,
      room: parsed.data.room,
      kind: parsed.data.kind,
      amount: parsed.data.amount,
    });
    return NextResponse.json({ ok: true, ...out });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'BET_FAIL' }, { status: 400 });
  }
}
