import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ROOMS, getActiveRound, dealBaccarat, settleRoundTx } from "../_utils";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const room = (url.searchParams.get("room") || "").toUpperCase();
  if (!ROOMS.includes(room as any)) return NextResponse.json({ error: "BAD_ROOM" }, { status: 400 });

  const active = await getActiveRound(room as any);
  if (!active) return NextResponse.json({ error: "NO_ROUND" }, { status: 404 });

  // 用 roundId 當種子，產生結果並結算
  const sim = dealBaccarat(active.id);
  await settleRoundTx(active.id, sim);

  return NextResponse.json({ ok: true, result: { outcome: sim.outcome, p: sim.pPts, b: sim.bPts, flags: sim.flags } });
}
