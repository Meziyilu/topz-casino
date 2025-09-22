import { NextRequest, NextResponse } from "next/server";
import { getState } from "@/services/roulette.service";
import type { RouletteRoomCode } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const room = searchParams.get("room") as RouletteRoomCode | null;
    if (!room) return NextResponse.json({ error: "NO_ROOM" }, { status: 400 });

    const data = await getState(room);
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "STATE_FAIL" }, { status: 400 });
  }
}
