// app/api/bank/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getBalances, getTodayOut } from "@/services/bank.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await getUserFromRequest(req);
    if (!auth?.id) return NextResponse.json({ ok: false }, { status: 401 });

    const { wallet, bank } = await getBalances(auth.id);
    const dailyOut = await getTodayOut(auth.id);

    return NextResponse.json({ ok: true, wallet, bank, dailyOut });
  } catch (e) {
    console.error("BANK_ME", e);
    return NextResponse.json({ ok: false, error: "INTERNAL" }, { status: 500 });
  }
}
