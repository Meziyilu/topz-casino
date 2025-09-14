import { NextResponse } from "next/server";
import { currentState } from "@/services/baccarat.service";

export async function GET() {
  try {
    // 三個固定房間
    const rooms = (["R30", "R60", "R90"] as const);

    // 抓每個房間的狀態
    const states = await Promise.all(rooms.map((r) => currentState(r)));

    return NextResponse.json({ rooms: states });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "UNKNOWN_ERROR" },
      { status: 500 }
    );
  }
}
