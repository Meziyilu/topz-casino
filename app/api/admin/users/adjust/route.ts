export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { credit, debit } from "@/services/wallet.service";
import type { BalanceTarget, LedgerType } from "@prisma/client";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const userId: string = body.userId;
    const amount: number = body.amount; // 正數=加幣；負數=扣幣
    const target: BalanceTarget = body.target || "WALLET";
    const type: LedgerType = body.type || "ADMIN_ADJUST";
    const note: string | undefined = body.note;

    if (!userId || !Number.isInteger(amount)) {
      return NextResponse.json({ error: "MISSING_PARAMS" }, { status: 400 });
    }
    if (amount === 0) {
      return NextResponse.json({ error: "AMOUNT_ZERO" }, { status: 400 });
    }

    if (amount > 0) {
      await credit(userId, target, amount, type, undefined /* meta 可帶說明欄位 */);
    } else {
      await debit(userId, target, -amount, type, undefined);
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "ADJUST_FAILED" }, { status: 500 });
  }
}
