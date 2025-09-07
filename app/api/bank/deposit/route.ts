// app/api/bank/deposit/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromRequest } from "@/lib/auth";
import { move } from "@/services/wallet.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  amount: z.number().int().positive(),
  // memo: z.string().max(120).optional(), // schema 無 memo，不存
});

export async function POST(req: NextRequest) {
  const auth = await getUserFromRequest(req);
  if (!auth) return NextResponse.json({ ok: false }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "BAD_BODY" }, { status: 400 });

  try {
    const { wallet, bank } = await move(auth.id, "WALLET", "BANK", parsed.data.amount, "DEPOSIT");
    return NextResponse.json({ ok: true, wallet, bank });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? "DEPOSIT_FAIL") }, { status: 400 });
  }
}
