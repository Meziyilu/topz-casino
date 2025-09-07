// app/api/bank/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getBalances, getDailyOutSum, listLedgers } from "@/services/wallet.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await getUserFromRequest(req);
  if (!auth) return NextResponse.json({ ok: false }, { status: 401 });

  try {
    const { wallet, bank } = await getBalances(auth.id);
    const dailyOut = await getDailyOutSum(auth.id);
    const { items } = await listLedgers(auth.id, { target: "BANK", limit: 20 });

    return NextResponse.json({
      ok: true,
      wallet,
      bank,
      dailyOut,
      recentLedgers: items,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: "BANK_ME_FAIL" }, { status: 500 });
  }
}
