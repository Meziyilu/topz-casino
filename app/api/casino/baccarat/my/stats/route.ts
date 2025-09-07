// app/api/casino/baccarat/my/stats/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { RoomCode } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getUserFromNextRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await getUserFromNextRequest(req);
  if (!auth?.id) return NextResponse.json({ ok: false }, { status: 401 });

  const url = new URL(req.url);
  const Schema = z.object({ room: z.nativeEnum(RoomCode) });
  const parsed = Schema.safeParse({ room: url.searchParams.get("room") as unknown });
  if (!parsed.success) return NextResponse.json({ ok: false, error: "BAD_ROOM" }, { status: 400 });

  // 下注總額、筆數、近 30 天勝負（示例）
  const total = await prisma.bet.aggregate({
    _sum: { amount: true },
    _count: true,
    where: { userId: auth.id, round: { room: parsed.data.room } },
  });

  // 可擴充去 ledger 查 PAYOUT - BET_PLACED 的淨利
  const payout = await prisma.ledger.aggregate({
    _sum: { amount: true },
    where: { userId: auth.id, type: "PAYOUT", target: "WALLET" },
  });
  const placed = await prisma.ledger.aggregate({
    _sum: { amount: true },
    where: { userId: auth.id, type: "BET_PLACED", target: "WALLET" },
  });

  const netProfit = (payout._sum.amount ?? 0) + (placed._sum.amount ?? 0); // BET_PLACED 是負值

  return NextResponse.json({
    ok: true,
    summary: {
      betsCount: total._count,
      betSum: total._sum.amount ?? 0,
      netProfit,
    },
  });
}
