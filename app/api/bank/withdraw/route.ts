// app/api/bank/withdraw/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { withdraw } from "@/services/bank.service";
import { z } from "zod";

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

    const payload = await req.json().catch(() => ({}));
    const p = Body.safeParse(payload);
    if (!p.success) return NextResponse.json({ ok: false, error: "BAD_PAYLOAD" }, { status: 400 });

    const r = await withdraw(auth.id, p.data.amount, p.data.memo);
    return NextResponse.json({ ok: true, ...r });
  } catch (e: any) {
    const code = String(e?.message || "");
    const map: Record<string, number> = {
      BAD_AMOUNT: 400,
      BANK_NOT_ENOUGH: 400,
      DAILY_OUT_LIMIT: 400,
      USER_NOT_FOUND: 404,
    };
    return NextResponse.json({ ok: false, error: code || "INTERNAL" }, { status: map[code] ?? 500 });
  }
}
