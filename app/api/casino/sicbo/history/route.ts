// app/api/casino/sicbo/history/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { SicBoRoomCode } from "@prisma/client";
import { getHistory } from "@/services/sicbo.service";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const room = (searchParams.get("room") as SicBoRoomCode) ?? "SB_R30";
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 20)));
  const items = await getHistory(room, limit);
  return NextResponse.json({ room, items });
}
