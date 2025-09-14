import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentStateWithMyBets } from "@/services/baccarat.service";
import { getUserFromRequest } from "@/lib/auth";
import type { RoomCode } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 驗證 room 必須是 enum
const Q = z.object({
  room: z.enum(["R30", "R60", "R90"]),
});

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const parsed = Q.safeParse({ room: url.searchParams.get("room") });
    if (!parsed.success) {
      return NextResponse.json({ error: "INVALID_ROOM" }, { status: 400 });
    }

    const user = await getUserFromRequest(req).catch(() => null);
    const room = parsed.data.room as RoomCode;

    // 如果有登入 → 帶下注紀錄
    if (user) {
      const state = await getCurrentStateWithMyBets(room, user.id);
      return NextResponse.json(state);
    }

    // 沒登入 → 只回傳公開狀態
    const state = await getCurrentStateWithMyBets(room, ""); // 傳空 userId，service 會回傳空 myBets
    return NextResponse.json(state);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "UNKNOWN_ERROR" },
      { status: 500 }
    );
  }
}
