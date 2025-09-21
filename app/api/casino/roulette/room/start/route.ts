import { NextRequest, NextResponse } from "next/server";
import { startRoomLoop } from "@/services/roulette.service";

export async function POST(req: NextRequest) {
  try {
    const { room } = await req.json();
    if (!room) return NextResponse.json({ error: "NO_ROOM" }, { status: 400 });
    await startRoomLoop(room); // 不用 worker：由進房觸發 loop/續跑
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "START_FAIL" }, { status: 400 });
  }
}
