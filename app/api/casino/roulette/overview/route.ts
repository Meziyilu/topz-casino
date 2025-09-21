import { NextRequest, NextResponse } from "next/server";
import { getOverview } from "@/services/roulette.service";

export async function GET(req: NextRequest) {
  const room = req.nextUrl.searchParams.get("room") as any;
  if (!room) return NextResponse.json({ error: "NO_ROOM" }, { status: 400 });
  try {
    const data = await getOverview(room);
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "OVERVIEW_FAIL" }, { status: 500 });
  }
}
