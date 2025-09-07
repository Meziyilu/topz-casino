// app/api/bank/transfer/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromRequest } from "@/lib/auth";
import { transferBankToOther } from "@/services/wallet.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  toUserId: z.string().min(10),
  amount: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  const auth = await getUserFromRequest(req);
  if (!auth) return NextResponse.json({ ok: false }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "BAD_BODY" }, { status: 400 });

  try {
    const { from } = await transferBankToOther(auth.id, parsed.data.toUserId, parsed.data.amount);
    return NextResponse.json({ ok: true, wallet: from.wallet, bank: from.bank });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? "TRANSFER_FAIL") }, { status: 400 });
  }
}
