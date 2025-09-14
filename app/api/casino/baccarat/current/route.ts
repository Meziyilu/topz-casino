import { NextResponse } from "next/server";
import { currentState, getMyBets } from "@/services/baccarat.service";

function getUserId(req: Request) {
  // 無需 JWT，從 header 帶入；沒帶就用 demo-user
  return req.headers.get("x-user-id") || "demo-user";
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const room = (searchParams.get("room") || "R30") as "R30" | "R60" | "R90";
    const userId = getUserId(req);

    // 當前狀態 + 我的近 10 筆下注
    const [state, myBets] = await Promise.all([
      currentState(room),
      getMyBets(userId, 10),
    ]);

    // 回傳結構保持簡單：前端可同時拿到狀態 & 自己的下注
    return NextResponse.json({ state, myBets });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "UNKNOWN_ERROR" },
      { status: 500 }
    );
  }
}
