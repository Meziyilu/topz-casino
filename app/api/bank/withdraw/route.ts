// app/api/bank/withdraw/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromRequest } from "@/lib/auth";
import { getDailyOutSum, move } from "@/services/wallet.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  amount: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  const auth = await getUserFromRequest(req);
  if (!auth) return NextResponse.json({ ok: false }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "BAD_BODY" }, { status: 400 });

  try {
    // 先檢查每日上限（服務層內 transfer 也會檢，但這裡先快速擋住）
    const today = await getDailyOutSum(auth.id);
    const DAILY_MAX = Number(process.env.BANK_DAILY_OUT_MAX ?? 2_000_000);
    if (today + parsed.data.amount > DAILY_MAX) {
      return NextResponse.json({ ok: false, error: "DAILY_OUT_LIMIT" }, { status: 400 });
    }

    const { wallet, bank } = await move(auth.id, "BANK", "WALLET", parsed.data.amount, "WITHDRAW");
    return NextResponse.json({ ok: true, wallet, bank });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? "WITHDRAW_FAIL") }, { status: 400 });
  }
}
