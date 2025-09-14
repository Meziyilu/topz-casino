import { NextResponse } from "next/server";
import { currentState } from "@/services/baccarat.service";

export async function GET() {
  try {
    const rooms: ("R30"|"R60"|"R90")[] = ["R30","R60","R90"];
    const states = await Promise.all(rooms.map(r => currentState(r)));
    const items = states.map(s => ({
      room: s.room,
      seq: s.seq ?? s.round?.seq ?? 0,
      phase: s.phase ?? s.round?.phase ?? "BETTING",
      endInSec: s.endInSec ?? 0,
      lockInSec: s.lockInSec ?? 0,
      timers: s.timers ?? undefined,
    }));
    return NextResponse.json({ items });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "UNKNOWN_ERROR" }, { status: 500 });
  }
}
