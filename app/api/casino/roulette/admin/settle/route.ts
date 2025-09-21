import { NextRequest, NextResponse } from "next/server";
import { settleRound } from "@/services/roulette.service";

export async function POST(req: NextRequest) {
  try {
    const { roundId, result } = await req.json();
    if (!roundId) return NextResponse.json({ error: "NO_ROUND" }, { status: 400 });
    const out = await settleRound(roundId, typeof result === "number" ? result : undefined);
    return NextResponse.json({ ok: true, ...out });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "SETTLE_FAIL" }, { status: 400 });
  }
}
