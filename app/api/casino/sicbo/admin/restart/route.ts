export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { SicBoRoomCode, SicBoPhase } from "@prisma/client";
import { taipeiNow } from "@/lib/time";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const room = body.room as SicBoRoomCode;
    if (!room) return NextResponse.json({ error: "MISSING_ROOM" }, { status: 400 });

    // 1) 將此房間所有「未結束」的局，統一結束
    await prisma.sicBoRound.updateMany({
      where: { room, phase: { not: SicBoPhase.SETTLED } },
      data: { phase: SicBoPhase.SETTLED, endedAt: taipeiNow() },
    });

    // 2) 立即開新局（BETTING，無骰）
    const newRound = await prisma.sicBoRound.create({
      data: { room, phase: SicBoPhase.BETTING, dice: [] },
    });

    return NextResponse.json({ ok: true, roundId: newRound.id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "RESTART_FAILED" }, { status: 500 });
  }
}
