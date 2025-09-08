// app/api/casino/baccarat/leaderboard/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { RoomCode } from "@prisma/client";

export const dynamic = "force-dynamic";

// 簡單示例：近 7 天、該房總贏額 Top 10（依你資料表調整）
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const room = searchParams.get("room") as RoomCode | null;

  if (!room) return NextResponse.json({ error: "ROOM_REQUIRED" }, { status: 400 });

  // 這裡示意計算：用 ledger 的 PAYOUT - BET_PLACED 匯總（依你的 schema 調整）
  // 若你沒有盈虧資料，可改用下注總額排行或當日中獎次數排行
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // 以下邏輯請依你的實際 table 改，這裡只提供一個可運作的方向
  const top = await prisma.$queryRawUnsafe<any[]>(`
    SELECT u.id as userId, u.nickname as name,
           SUM(CASE WHEN l.type='PAYOUT' THEN l.amount ELSE 0 END) +
           SUM(CASE WHEN l.type='BET_PLACED' THEN l.amount ELSE 0 END) AS net
    FROM "Ledger" l
    JOIN "User" u ON u.id = l."userId"
    WHERE l."createdAt" >= $1
    GROUP BY u.id, u.nickname
    ORDER BY net DESC
    LIMIT 10
  `, since);

  return NextResponse.json({ items: top.map((r, i) => ({ rank: i + 1, name: r.name || r.userId, score: Number(r.net)||0 })) });
}
