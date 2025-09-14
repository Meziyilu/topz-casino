import { NextRequest, NextResponse } from "next/server";
import { getCurrentStateWithMyBets } from "@/services/baccarat.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 取得當前房間狀態（含我的下注）
export async function POST(req: NextRequest) {
  try {
    const { room, userId } = await req.json();
    const state = await getCurrentStateWithMyBets(room, userId);
    return NextResponse.json(state);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "UNKNOWN_ERROR" }, { status: 500 });
  }
}
