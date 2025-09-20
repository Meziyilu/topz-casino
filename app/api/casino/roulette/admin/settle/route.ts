export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { settleRound } from '@/services/roulette.service';
// import { verifyRequest } from '@/lib/jwt';

const Body = z.object({
  roundId: z.string().min(1),
  result: z.number().int().min(0).max(36).optional(), // 可指定
});

export async function POST(req: NextRequest) {
  try {
    // await verifyRequest(req);
    const body = await req.json();
    const parsed = Body.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'BAD_BODY' }, { status: 400 });

    const out = await settleRound(parsed.data.roundId, parsed.data.result);
    return NextResponse.json({ ok: true, ...out });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'SETTLE_FAIL' }, { status: 400 });
  }
}
