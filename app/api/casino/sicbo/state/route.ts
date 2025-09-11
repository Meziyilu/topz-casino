export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getOrRotateRound } from "@/services/sicbo.service";
import { SicBoRoomCode } from "@prisma/client";
import { getOptionalUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const room = url.searchParams.get("room") as SicBoRoomCode;
    if (!room) return NextResponse.json({ error: "MISSING_ROOM" }, { status: 400 });

    const { round, meta, locked, timers } = await getOrRotateRound(room);

    // ✅ 把使用者下注狀態一起回傳（如果已登入）
    const uid = await getOptionalUserId(req);
    let myBets: any[] = [];
    if (uid) {
      myBets = await prisma.sicBoBet.findMany({
        where: { roundId: round.id, userId: uid },
        select: { kind: true, amount: true, payload: true },
      });
    }

    return NextResponse.json({
      room,
      round,
      timers,
      locked,
      myBets,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "STATE_FAILED" }, { status: 500 });
  }
}
