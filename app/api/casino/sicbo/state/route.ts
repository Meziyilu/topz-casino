export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { SicBoRoomCode } from "@prisma/client";
import { getOrRotateRound } from "@/services/sicbo.service";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const room = url.searchParams.get("room") as SicBoRoomCode;
    if (!room) return NextResponse.json({ error: "MISSING_ROOM" }, { status: 400 });

    const { round, timers, locked, meta } = await getOrRotateRound(room);
    return NextResponse.json({
      room,
      round: {
        id: round.id,
        phase: round.phase,
        startedAt: round.startedAt,
        endedAt: round.endedAt,
        dice: round.dice as number[] | [],
      },
      timers,
      locked,
      meta, // 如前端不需要可拿掉
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "STATE_FAILED" }, { status: 500 });
  }
}
