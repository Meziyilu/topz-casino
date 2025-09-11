// app/api/casino/sicbo/admin/roll/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { SicBoRoomCode } from "@prisma/client";
import { getOrRotateRound, revealAndSettle } from "@/services/sicbo.service";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const room = (body.room as SicBoRoomCode) ?? "SB_R30";

  const { round } = await getOrRotateRound(room);
  const settled = await revealAndSettle(round.id);

  return NextResponse.json({
    ok: true,
    roundId: settled.id,
    dice: settled.dice,
    phase: settled.phase,
    endedAt: settled.endedAt,
  });
}
