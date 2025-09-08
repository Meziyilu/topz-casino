// app/api/casino/baccarat/my-bets/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import type { BetSide, RoomCode } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const room = searchParams.get("room") as RoomCode | null;
    if (!room) return NextResponse.json({ error: "ROOM_REQUIRED" }, { status: 400 });

    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

    // 找該房最新一局
    const cur = await prisma.round.findFirst({
      where: { room },
      orderBy: { startedAt: "desc" },
      select: { id: true },
    });
    if (!cur) return NextResponse.json({ items: [] });

    // 彙總我在這局的下注
    const rows = await prisma.bet.groupBy({
      by: ["side"],
      where: { userId: user.id, roundId: cur.id },
      _sum: { amount: true },
    });

    const items = rows.map(r => ({
      side: r.side as BetSide,
      amount: r._sum.amount || 0,
    }));

    return NextResponse.json({ items });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "SERVER_ERROR" }, { status: 500 });
  }
}
