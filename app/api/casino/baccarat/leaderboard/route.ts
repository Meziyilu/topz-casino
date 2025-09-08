// app/api/casino/baccarat/leaderboard/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { RoomCode } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * 以「下注總額」做排行榜（Top 10）
 * - 範圍：指定房間 + 近 N 天（預設 7）
 * - 依賴：Bet.roundId -> Round.room 關聯
 *
 * ⚠️ 想做「淨利（派彩-下注）」排行榜？
 *    你的 Ledger 目前沒有 roundId/room，無法按房間切割。
 *    之後可在 Ledger 新增 roundId（或 room），結算時一起寫入，再按房間彙總。
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const room = searchParams.get("room") as RoomCode | null;
    const days = Number(searchParams.get("days") || 7);

    if (!room) {
      return NextResponse.json({ ok: false, error: "ROOM_REQUIRED" }, { status: 400 });
    }
    if (!["R30", "R60", "R90"].includes(room)) {
      return NextResponse.json({ ok: false, error: "ROOM_INVALID" }, { status: 400 });
    }

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // 1) 近 N 天、指定房的下注彙總（每位使用者）
    const betAgg = await prisma.bet.groupBy({
      by: ["userId"],
      where: {
        createdAt: { gte: since },
        round: { room }, // 關鍵：透過 relation 到 Round 過濾房間
      },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 10,
    });

    if (betAgg.length === 0) {
      return NextResponse.json({ ok: true, room, metric: "bet_volume", items: [] });
    }

    // 2) 撈 user 暱稱（或名稱），回傳顯示用
    const userIds = betAgg.map((b) => b.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, nickname: true, name: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u.nickname || u.name || u.id]));

    // 3) 組排行榜資料
    const items = betAgg.map((row, i) => ({
      rank: i + 1,
      userId: row.userId,
      name: userMap.get(row.userId) ?? row.userId,
      // 這版用「下注總額」作為分數；若要改「淨利」請見上方註解
      score: Number(row._sum.amount || 0),
    }));

    return NextResponse.json({ ok: true, room, metric: "bet_volume", days, items });
  } catch (err: any) {
    console.error("[leaderboard] error:", err);
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
