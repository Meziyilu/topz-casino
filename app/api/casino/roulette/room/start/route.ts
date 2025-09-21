// app/api/casino/roulette/room/start/route.ts
import { NextRequest, NextResponse } from "next/server";
import { startRoomLoop } from "@/services/roulette.service";
import type { RouletteRoomCode } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const { room } = await req.json();
    if (!room) return NextResponse.json({ error: "NO_ROOM" }, { status: 400 });
    const out = await startRoomLoop(room as RouletteRoomCode);
    return NextResponse.json({ ok: true, ...out });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "START_FAIL" }, { status: 400 });
  }
}
