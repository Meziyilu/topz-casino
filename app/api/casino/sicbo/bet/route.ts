// app/api/casino/sicbo/bet/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { placeBet } from "@/services/sicbo.service";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  try {
    const { round, bet } = await placeBet({
      userId: String(body.userId), // ⚠️ 無驗證：請從 body 帶 userId
      room: body.room,
      kind: body.kind,
      amount: Number(body.amount),
      payload: body.payload,
    });
    return NextResponse.json({ ok: true, roundId: round.id, betId: bet.id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || String(e) }, { status: 400 });
  }
}
