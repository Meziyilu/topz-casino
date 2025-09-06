// app/api/casino/baccarat/state/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ensureCurrentRound, buildStateDTO } from "@/services/baccarat.service";
import { getUserFromRequest } from "@/lib/authz";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const roomParam = String(searchParams.get("room") || "R60").toUpperCase() as any; // "R30" | "R60" | "R90"

    // 1) 取得/建立當日回合
    const round = await ensureCurrentRound(roomParam);

    // 2) 當前使用者（帶錢包）
    const me = await getUserFromRequest(req);

    // 3) 組合狀態（含：phase / secLeft / result / cards / recent / 我的當局下注彙總）
    const dto = await buildStateDTO({
      round,
      includeMyBetsForUserId: me?.id ?? null,
    });

    // 4) 附帶錢包餘額（給前端顯示）
    return NextResponse.json({
      ...dto,
      balance: me ? me.balance : null,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "STATE_FAIL" }, { status: 400 });
  }
}
