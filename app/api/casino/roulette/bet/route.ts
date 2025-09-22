import { NextRequest, NextResponse } from "next/server";
import { placeBet } from "@/services/roulette.service";
import type { RouletteRoomCode, RouletteBetKind } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = body.userId || body.me?.id || body.uid; // 依你現場登入機制替換
    if (!userId) return NextResponse.json({ error: "NO_USER" }, { status: 401 });

    const room = body.room as RouletteRoomCode | undefined;
    const kind = body.kind as RouletteBetKind | undefined;
    const amount = Number(body.amount);
    const payload = body.payload;

    if (!room || !kind || !amount) {
      return NextResponse.json({ error: "BAD_BODY" }, { status: 400 });
    }

    const out = await placeBet({ userId, room, kind, amount, payload });
    return NextResponse.json(out);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "BET_FAIL" }, { status: 400 });
  }
}
