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

    const json = await req.json().catch(() => null);
    const parsed = Body.safeParse(json);
    if (!parsed.success) return NextResponse.json({ ok: false, error: "BAD_BODY" }, { status: 400 });

    const { wallet, bank } = await transfer(auth.id, parsed.data.toUserId, parsed.data.amount, parsed.data.memo);
    return NextResponse.json({ ok: true, wallet, bank });
  } catch (e) {
    console.error("BANK_TRANSFER", e);
    return NextResponse.json({ ok: false, error: String((e as Error).message || "INTERNAL") }, { status: 400 });
  }
}
