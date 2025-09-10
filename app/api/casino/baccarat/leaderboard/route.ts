// app/api/casino/baccarat/leaderboard/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma, { Prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const room = (searchParams.get("room") ?? "R60") as string;
  const day = searchParams.get("day") ?? new Date().toISOString().slice(0, 10);

  // 方式 A：參數 cast 成 enum
  const roomEnum = Prisma.sql`${room}::"RoomCode"`;

  const rows = await prisma.$queryRaw(Prisma.sql`
    SELECT "userId", SUM("amount") AS net
    FROM "Ledger"
    WHERE "day" = ${day}
      AND "room" = ${roomEnum}
      AND "type" IN ('BET_PLACED','PAYOUT')   -- 依你實際條件調整
    GROUP BY "userId"
    ORDER BY net DESC
    LIMIT 50
  `);

  return NextResponse.json({ items: rows });
}
