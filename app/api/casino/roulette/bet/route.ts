import { NextRequest, NextResponse } from "next/server";
import { placeBet } from "@/services/roulette.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { room, kind, amount, payload } = body ?? {};
    if (!room || !kind || !amount) return NextResponse.json({ error: "BAD_BODY" }, { status: 400 });

    const out = await placeBet({ userId: "ME", room, kind, amount, payload }); // TODO: 你已有 getUserFromRequest
    return NextResponse.json({ ok: true, ...out });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "BET_FAIL" }, { status: 400 });
  }
}
