// app/api/bank/transfer/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromRequest } from "@/lib/auth";
import { transfer } from "@/services/bank.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  toUserId: z.string().min(1),
  amount: z.number().int().positive(),
  memo: z.string().max(120).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const auth = await getUserFromRequest(req);
    if (!auth?.id) return NextResponse.json({ ok: false }, { status: 401 });

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ ok: false, error: "BAD_BODY" }, { status: 400 });

    const { wallet, bank, recipientBank } = await transfer(
      auth.id,
      parsed.data.toUserId,
      parsed.data.amount,
      parsed.data.memo
    );
    return NextResponse.json({ ok: true, wallet, bank, recipientBank });
  } catch (e: any) {
    console.error("BANK_TRANSFER", e);
    const msg = String(e?.message || "INTERNAL");
    const code = ["AMOUNT_INVALID", "SELF_TRANSFER_NOT_ALLOWED", "BANK_NOT_ENOUGH", "DAILY_OUT_LIMIT"].includes(msg)
      ? 400
      : 500;
    return NextResponse.json({ ok: false, error: msg }, { status: code });
  }
}
