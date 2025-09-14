import { NextRequest, NextResponse } from "next/server";
import { placeBet } from "@/services/baccarat.service";
import { BetSide, RoomCode } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 玩家下注
export async function POST(req: NextRequest) {
  try {
    const { userId, room, roundId, side, amount } = await req.json();

    if (!userId) throw new Error("MISSING_USER_ID");
    if (!room) throw new Error("MISSING_ROOM");
    if (!roundId) throw new Error("MISSING_ROUND");
    if (!side) throw new Error("MISSING_SIDE");
    if (!amount || amount <= 0) throw new Error("INVALID_AMOUNT");

    const bet = await placeBet(
      userId as string,
      room as RoomCode,
      roundId as string,
      side as BetSide,
      Number(amount)
    );

    return NextResponse.json({ ok: true, bet });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "UNKNOWN_ERROR" }, { status: 400 });
  }
}
