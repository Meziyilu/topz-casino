// app/api/bank/withdraw/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromRequest } from "@/lib/auth";
import { withdraw } from "@/services/bank.service";

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

    const { wallet, bank } = await withdraw(auth.id, parsed.data.amount, parsed.data.memo);
    return NextResponse.json({ ok: true, wallet, bank });
  } catch (e: any) {
    console.error("BANK_WITHDRAW", e);
    const msg = String(e?.message || "INTERNAL");
    const code = ["AMOUNT_INVALID", "BANK_NOT_ENOUGH", "DAILY_OUT_LIMIT"].includes(msg) ? 400 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status: code });
  }
}
