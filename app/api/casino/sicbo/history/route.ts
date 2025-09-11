export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getHistory } from "@/services/sicbo.service";
import { SicBoRoomCode } from "@prisma/client";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const room = url.searchParams.get("room") as SicBoRoomCode;
    const limit = Number(url.searchParams.get("limit") || 30);
    if (!room) return NextResponse.json({ error: "MISSING_ROOM" }, { status: 400 });

    const items = await getHistory(room, limit);
    return NextResponse.json({ room, items });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "HISTORY_FAILED" }, { status: 500 });
  }
}
