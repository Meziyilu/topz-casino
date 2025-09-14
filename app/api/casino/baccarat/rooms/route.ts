import { NextResponse } from "next/server";
import { getRooms, getRoomInfo } from "@/services/baccarat.service";
import type { RoomCode } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 取得所有房間資訊（含狀態與歷史）
export async function GET() {
  try {
    const rooms = await getRooms();

    // 把每個房間的 state/history 一併帶回
    const withInfo = await Promise.all(
      rooms.map(async (r) => {
        const info = await getRoomInfo(r.code as RoomCode);
        return { ...r, ...info };
      })
    );

    return NextResponse.json({ rooms: withInfo });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "UNKNOWN_ERROR" },
      { status: 500 }
    );
  }
}
