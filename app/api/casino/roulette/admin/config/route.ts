// app/api/casino/roulette/admin/config/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { GameCode } from '@prisma/client'; // ⬅ 新增

const Keys = [
  'RL_R30_DRAW_INTERVAL_SEC',
  'RL_R60_DRAW_INTERVAL_SEC',
  'RL_R90_DRAW_INTERVAL_SEC',
  'RL_BETTING_SEC',
  'RL_REVEAL_WINDOW_SEC',
] as const;

const PutBody = z.object({
  key: z.enum(Keys),
  valueInt: z.number().int().min(1).max(600),
});

export async function GET() {
  const rows = await prisma.gameConfig.findMany({
    where: { gameCode: GameCode.GLOBAL }, // ⬅ 改 enum
    orderBy: { key: 'asc' },
  });
  return NextResponse.json(rows.filter(r => r.key.startsWith('RL_'))); // 只回 RL_ 命名空間
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = PutBody.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'BAD_BODY' }, { status: 400 });

    const row = await prisma.gameConfig.upsert({
      where: { gameCode_key: { gameCode: GameCode.GLOBAL, key: parsed.data.key } }, // ⬅ 改 enum
      create: { gameCode: GameCode.GLOBAL, key: parsed.data.key, valueInt: parsed.data.valueInt },
      update: { valueInt: parsed.data.valueInt },
    });
    return NextResponse.json({ ok: true, row });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'CFG_FAIL' }, { status: 400 });
  }
}
