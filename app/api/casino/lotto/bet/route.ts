// app/api/casino/lotto/bet/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { placeBet, readConfig } from "@/services/lotto.service";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, picks, amount } = body as { userId: string; picks: number[]; amount: number; };
    if (!userId || !Array.isArray(picks) || !amount) {
      return NextResponse.json({ error: "MISSING_PARAMS" }, { status: 400 });
    }

    // 基本驗證（免 JWT，僅檢查格式）
    const cfg = await readConfig();
    if (picks.length !== cfg.picksCount) {
      return NextResponse.json({ error: `PICKS_MUST_BE_${cfg.picksCount}` }, { status: 400 });
    }
    if (picks.some(n => n < 1 || n > cfg.pickMax)) {
      return NextResponse.json({ error: "PICK_OUT_OF_RANGE" }, { status: 400 });
    }

    const result = await placeBet({ userId, picks, amount, special: null });
    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 400 });
  }
}
