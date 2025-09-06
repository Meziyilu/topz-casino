// app/api/bank/deposit/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromRequest } from "@/lib/auth";
import { deposit } from "@/services/bank.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  amount: z.number().int().positive(),
  memo: z.string().max(120).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const auth = await getUserFromRequest(req);
    if (!auth?.id) return NextResponse.json({ ok: false }, { status: 401 });

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ ok: false, error: "BAD_BODY" }, { status: 400 });

    // service 第三參數 memo 可選且被忽略（Ledger 沒有 memo 欄位）
    const { wallet, bank } = await deposit(auth.id, parsed.data.amount, parsed.data.memo);
    return NextResponse.json({ ok: true, wallet, bank });
  } catch (e: any) {
    console.error("BANK_DEPOSIT", e);
    const msg = String(e?.message || "INTERNAL");
    const code = ["AMOUNT_INVALID", "WALLET_NOT_ENOUGH"].includes(msg) ? 400 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status: code });
  }
}
