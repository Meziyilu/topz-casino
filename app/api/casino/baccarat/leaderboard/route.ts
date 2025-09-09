// app/api/casino/baccarat/leaderboard/route.ts
import { NextRequest, NextResponse } from "next/server";
import type { RoomCode } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const room = (searchParams.get("room") || "").toUpperCase() as RoomCode;
    if (!["R30","R60","R90"].includes(room)) {
      return NextResponse.json({ items: [] });
    }
    const since = new Date(Date.now() - 7*24*60*60*1000);
    // 你的 schema 若沒有房間欄位，就先不過濾房間，純示意
    const rows: any[] = await prisma.$queryRawUnsafe(`
      SELECT u.id as userId, COALESCE(u.nickname, u.id) as name,
             SUM(CASE WHEN l.type='PAYOUT' THEN l.amount ELSE 0 END) +
             SUM(CASE WHEN l.type='BET_PLACED' THEN l.amount ELSE 0 END) AS net
      FROM "Ledger" l
      JOIN "User" u ON u.id = l."userId"
      WHERE l."createdAt" >= $1
      GROUP BY u.id, u.nickname
      ORDER BY net DESC
      LIMIT 10
    `, since);
    const items = rows.map((r, i) => ({ rank: i+1, name: r.name, score: Number(r.net) || 0 }));
    return NextResponse.json({ items });
  } catch (e) {
    console.error("[leaderboard] error:", e);
    return NextResponse.json({ items: [] });
  }
}
