import { NextResponse } from "next/server";
import { placeBet } from "@/services/baccarat.service";

function getUserId(req: Request) {
  return req.headers.get("x-user-id") || "demo-user";
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as {
      room: "R30"|"R60"|"R90",
      roundId: string,
      side:
        | "PLAYER" | "BANKER" | "TIE"
        | "PLAYER_PAIR" | "BANKER_PAIR"
        | "ANY_PAIR" | "PERFECT_PAIR"
        | "BANKER_SUPER_SIX",
      amount: number
    };

    if (!body?.room || !body?.roundId || !body?.side || !Number(body?.amount))
      return NextResponse.json({ error: "INVALID_PAYLOAD" }, { status: 400 });

    const userId = getUserId(req);
    await placeBet(userId, body.room, body.roundId, body.side as any, Number(body.amount));
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const msg = String(e?.message || "");
    const status =
      msg === "ROUND_NOT_FOUND" ? 404 :
      msg === "BET_LOCKED" ? 409 :
      msg === "INSUFFICIENT_BALANCE" ? 402 :
      msg === "INVALID_AMOUNT" ? 400 : 500;
    return NextResponse.json({ error: msg || "UNKNOWN_ERROR" }, { status });
  }
}
