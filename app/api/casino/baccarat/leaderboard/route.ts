// app/api/casino/baccarat/leaderboard/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { RoomCode } from "@prisma/client";

export const dynamic = "force-dynamic";

// 算近 7 天該房間的淨利
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const room = searchParams.get("room") as RoomCode | null;
    if (!room) {
      return NextResponse.json({ error: "ROOM_REQUIRED" }, { status: 400 });
    }

    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // 用 Ledger 算 PAYOUT - BET_PLACED
    const rows = await prisma.$queryRawUnsafe<any[]>(`
      SELECT u.id as "userId", u."displayName" as name,
        SUM(CASE WHEN l.type='PAYOUT' THEN l.amount ELSE 0 END) -
        SUM(CASE WHEN l.type='BET_PLACED' THEN l.amount ELSE 0 END) as net
      FROM "Ledger" l
      JOIN "User" u ON u.id = l."userId"
      WHERE l."createdAt" >= $1 AND l.room = $2
      GROUP BY u.id, u."displayName"
      ORDER BY net DESC
      LIMIT 10
    `, since, room);

    return NextResponse.json({
      ok: true,
      items: rows.map((r, i) => ({
        rank: i + 1,
        name: r.name || `玩家${r.userId.slice(0, 6)}`,
        score: Number(r.net) || 0,
      })),
    });
  } catch (e) {
    console.error("[leaderboard] error", e);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
