import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserOrThrow } from "@/lib/auth";
import type { RoomCode, BetSide } from "@prisma/client";
import { settleRound } from "@/services/baccarat.service";

const SIMPLE_ODDS: Record<BetSide, number> = {
  PLAYER: 1,
  BANKER: 1,          //（未處理超6，簡化）
  TIE: 8,
  PLAYER_PAIR: 11,
  BANKER_PAIR: 11,
  ANY_PAIR: 5,
  PERFECT_PAIR: 25,
  BANKER_SUPER_SIX: 12, // 若 outcome BANKER 且總點 6 才算，這裡簡化為固定賠率；進階可在 settleRound 裡分支
};

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const u = await getUserOrThrow(req);
    if (!u.isAdmin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

    const url = new URL(req.url);
    const room = (url.searchParams.get("room") || "R30").toUpperCase() as RoomCode;

    const body = await req.json().catch(() => ({}));
    const outcome = (body?.outcome || "PLAYER") as "PLAYER" | "BANKER" | "TIE";

    const cur = await prisma.round.findFirst({ where: { room }, orderBy: { startedAt: "desc" } });
    if (!cur) return NextResponse.json({ error: "ROUND_NOT_FOUND" }, { status: 404 });

    // 結算（把錢派回去）
    await settleRound(cur.id, outcome, SIMPLE_ODDS);

    return NextResponse.json({ ok: true, roundId: cur.id, outcome });
  } catch (e:any) {
    return NextResponse.json({ error: e?.message || "SERVER_ERROR" }, { status: 500 });
  }
}
