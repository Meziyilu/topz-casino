// app/api/casino/roulette/bet/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { placeBet } from '@/services/roulette.service';
import { RouletteRoomCode, RouletteBetKind } from '@prisma/client'; // 這行要有！

const Body = z.object({
  room: z.nativeEnum(RouletteRoomCode),
  kind: z.nativeEnum(RouletteBetKind),      // 讓 kind 成為 enum 而不是 string
  amount: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = Body.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'BAD_BODY', issues: parsed.error.format() }, { status: 400 });
    }

    const me = { id: 'demo-user-id' }; // 你的驗證邏輯替換這裡

    const out = await placeBet({
      userId: me.id,
      room: parsed.data.room,
      kind: parsed.data.kind,  // 現在型別就是 RouletteBetKind，不會再紅線
      amount: parsed.data.amount,
    });

    return NextResponse.json({ ok: true, ...out });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'BET_FAIL' }, { status: 400 });
  }
}
