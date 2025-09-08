import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { RoomCode } from "@prisma/client";

/** 你的房間時間（和 services 的 ROOM_CONFIG.secondsPerRound 一致） */
const ROOM_SECONDS: Record<RoomCode, number> = { R30: 30, R60: 60, R90: 90 };

export const dynamic = "force-dynamic";

/**
 * 簡易 scheduler：
 * - 若房內沒有進行中的 round：開新局 (BETTING)
 * - 若進行中且超時：呼叫 /admin/settle 做結算
 * - 若已結算：開下一局
 */
export async function POST() {
  const rooms: RoomCode[] = ["R30", "R60", "R90"];
  const now = Date.now();
  const actions: any[] = [];

  for (const room of rooms) {
    const cur = await prisma.round.findFirst({
      where: { room },
      orderBy: { startedAt: "desc" },
    });

    if (!cur) {
      // 開第一局
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/casino/baccarat/admin/start?room=${room}&seconds=${ROOM_SECONDS[room]}`, { method: "POST" });
      actions.push({ room, action: "START" });
      continue;
    }

    if (cur.phase === "BETTING") {
      const ms = cur.startedAt.getTime() + ROOM_SECONDS[room] * 1000 - now;
      if (ms <= 0) {
        await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/casino/baccarat/admin/settle?room=${room}`, { method: "POST" });
        actions.push({ room, action: "SETTLE" });
      } else {
        actions.push({ room, action: "WAIT", secLeft: Math.floor(ms / 1000) });
      }
    } else if (cur.phase === "REVEALING" || cur.phase === "SETTLED") {
      // 已結束：開下一局
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/casino/baccarat/admin/start?room=${room}&seconds=${ROOM_SECONDS[room]}`, { method: "POST" });
      actions.push({ room, action: "START_NEXT" });
    } else {
      actions.push({ room, action: "UNKNOWN_PHASE", phase: cur.phase });
    }
  }

  return NextResponse.json({ ok: true, actions });
}
