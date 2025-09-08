import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { RoomCode, RoundPhase } from "@prisma/client";

export const dynamic = "force-dynamic";

/** 用來手動在某房間開新局。?room=R30&seconds=30（不給 seconds 就用預設） */
export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const room = (searchParams.get("room") || "R30") as RoomCode;
    const seconds = Number(searchParams.get("seconds") || 0) || 60;

    // 若該房已有一局在 BETTING / REVEALING，就直接回傳那局
    const cur = await prisma.round.findFirst({
      where: { room, phase: { in: ["BETTING" as RoundPhase, "REVEALING" as RoundPhase] } },
      orderBy: { startedAt: "desc" },
    });
    if (cur) {
      return NextResponse.json({ ok: true, roundId: cur.id, phase: cur.phase, room });
    }

    // 當日局序
    const now = new Date();
    const startOfDay = new Date(now); startOfDay.setHours(0,0,0,0);
    const todayCount = await prisma.round.count({
      where: { room, startedAt: { gte: startOfDay } },
    });

    const r = await prisma.round.create({
      data: {
        room,
        phase: "BETTING",
        startedAt: now,
        // 你 schema 如果有 endsAt 欄位也可以同時寫入
        // endsAt: new Date(now.getTime() + seconds * 1000),
        roundSeq: todayCount + 1, // 若你 schema 沒有就移除
      } as any,
    });

    return NextResponse.json({ ok: true, roundId: r.id, room, seconds });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e.message||"FAILED" }, { status: 500 });
  }
}
