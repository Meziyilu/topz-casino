import { NextRequest, NextResponse } from "next/server";
import { settleRound } from "@/services/baccarat.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 手動結算某一局（管理用）
export async function POST(req: NextRequest) {
  try {
    const { roundId } = await req.json();
    if (!roundId) throw new Error("MISSING_ROUND_ID");

    await settleRound(roundId as string);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "UNKNOWN_ERROR" }, { status: 400 });
  }
}
