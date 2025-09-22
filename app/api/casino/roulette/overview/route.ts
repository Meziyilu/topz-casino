import { NextRequest, NextResponse } from "next/server";
import { getOverview } from "@/services/roulette.service";
import type { RouletteRoomCode } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const room = searchParams.get("room") as RouletteRoomCode | null;
    if (!room) return NextResponse.json({ error: "NO_ROOM" }, { status: 400 });

    // 這裡可從 cookie/JWT 取 userId；暫不強求
    const data = await getOverview(room);
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "OVERVIEW_FAIL" }, { status: 400 });
  }
}
