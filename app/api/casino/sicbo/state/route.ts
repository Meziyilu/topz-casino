export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { SicBoRoomCode } from "@prisma/client";
import { getOrRotateRound } from "@/services/sicbo.service";
import { taipeiNow, secUntil } from "@/lib/time";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const room = (searchParams.get("room") as SicBoRoomCode) ?? "SB_R30";
  const { round, meta, locked } = await getOrRotateRound(room);

  const willLockAt = new Date(round.startedAt.getTime() + (meta.drawIntervalSec - meta.lockBeforeRollSec) * 1000);
  const willEndAt  = new Date(round.startedAt.getTime() + meta.drawIntervalSec * 1000);

  return NextResponse.json({
    room,
    round: { id: round.id, phase: round.phase, dice: round.dice, startedAt: round.startedAt, endedAt: round.endedAt },
    config: meta,
    timers: { lockInSec: secUntil(willLockAt), endInSec: secUntil(willEndAt) },
    serverTime: taipeiNow().toISOString(),
    locked,
  });
}
