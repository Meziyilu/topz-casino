import { NextRequest, NextResponse } from "next/server";
import { settleRound } from "@/services/roulette.service";

export async function POST(req: NextRequest) {
  try {
    const { roundId } = await req.json();
    if (!roundId) return NextResponse.json({ error: "NO_ROUND" }, { status: 400 });
    await settleRound(roundId);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "SETTLE_FAIL" }, { status: 400 });
  }
}
