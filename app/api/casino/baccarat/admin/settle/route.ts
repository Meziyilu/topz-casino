import { NextRequest, NextResponse } from "next/server";
import type { BetSide, RoomCode } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentRound, settleRound } from "@/services/baccarat.service";

function assertAdmin(req: NextRequest) {
  const env = process.env.ADMIN_TOKEN?.trim();
  const fromHeader = req.headers.get("x-admin-token")?.trim();
  const fromQuery = new URL(req.url).searchParams.get("token")?.trim();
  if (!env) return;
  if (fromHeader !== env && fromQuery !== env) throw new Error("UNAUTHORIZED");
}

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    assertAdmin(req);
    const url = new URL(req.url);
    const room = (url.searchParams.get("room") || "R30").toUpperCase() as RoomCode;
    const cur = await getCurrentRound(room);
    if (!cur) return NextResponse.json({ ok: false, error: "NO_ROUND" }, { status: 400 });

    const outcome = (url.searchParams.get("outcome")?.toUpperCase() as "PLAYER"|"BANKER"|"TIE") || "PLAYER";
    const payoutMap: Record<BetSide, number> = { PLAYER: 1, BANKER: 1, TIE: 8, PLAYER_PAIR: 0, BANKER_PAIR: 0, ANY_PAIR: 0, PERFECT_PAIR: 0, BANKER_SUPER_SIX: 0 } as any;
    await settleRound(cur.id, outcome, payoutMap);

    return NextResponse.json({ ok: true, settledId: cur.id, outcome });
  } catch (e: any) {
    const msg = e?.message || "SERVER_ERROR";
    return NextResponse.json({ ok: false, error: msg }, { status: msg === "UNAUTHORIZED" ? 401 : 500 });
  }
}
