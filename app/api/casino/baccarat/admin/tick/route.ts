import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserOrThrow } from "@/lib/auth";
import type { RoomCode, BetSide } from "@prisma/client";
import { getRoomInfo, settleRound } from "@/services/baccarat.service";

const SIMPLE_ODDS: Record<BetSide, number> = {
  PLAYER: 1, BANKER: 1, TIE: 8,
  PLAYER_PAIR: 11, BANKER_PAIR: 11, ANY_PAIR: 5, PERFECT_PAIR: 25,
  BANKER_SUPER_SIX: 12,
};

export const dynamic = "force-dynamic";

function pickOutcome(): "PLAYER"|"BANKER"|"TIE" {
  const r = Math.random();
  if (r < 0.46) return "PLAYER";
  if (r < 0.92) return "BANKER";
  return "TIE";
}

export async function POST(req: NextRequest) {
  try {
    const u = await getUserOrThrow(req);
    if (!u.isAdmin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

    const url = new URL(req.url);
    const room = (url.searchParams.get("room") || "R30").toUpperCase() as RoomCode;

    const rc = await getRoomInfo(room);
    const cur = await prisma.round.findFirst({ where: { room }, orderBy: { startedAt: "desc" } });

    // 沒局 => 自動開
    if (!cur) {
      const r = await prisma.round.create({ data: { room, phase: "BETTING", startedAt: new Date() } });
      return NextResponse.json({ ok: true, action: "STARTED", id: r.id });
    }

    if (cur.phase === "BETTING") {
      const endAt = new Date(cur.startedAt.getTime() + rc.secondsPerRound * 1000);
      if (Date.now() >= endAt.getTime()) {
        // 到時間 -> 結算 + 直接開下一局（可選）
        const outcome = pickOutcome();
        await settleRound(cur.id, outcome, SIMPLE_ODDS);

        // 自動開下一局（讓前端有新的倒數）
        const next = await prisma.round.create({ data: { room, phase: "BETTING", startedAt: new Date() } });
        return NextResponse.json({ ok: true, action: "SETTLED_AND_STARTED_NEXT", outcome, nextId: next.id });
      } else {
        return NextResponse.json({ ok: true, action: "WAITING", secLeft: Math.ceil((endAt.getTime()-Date.now())/1000) });
      }
    }

    if (cur.phase === "SETTLED") {
      // 若已結算，確保下一局存在
      const next = await prisma.round.create({ data: { room, phase: "BETTING", startedAt: new Date() } });
      return NextResponse.json({ ok: true, action: "STARTED_NEXT", nextId: next.id });
    }

    // （若你有 REVEALING 期，在這裡判斷切換為 SETTLED）
    return NextResponse.json({ ok: true, action: "NOOP", phase: cur.phase });
  } catch (e:any) {
    return NextResponse.json({ error: e?.message || "SERVER_ERROR" }, { status: 500 });
  }
}
