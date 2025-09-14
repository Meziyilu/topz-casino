import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 取得玩家下注紀錄
export async function POST(req: NextRequest) {
  try {
    const { userId, take = 10 } = await req.json();

    const bets = await prisma.bet.findMany({
      where: { userId },
      include: { round: true },
      orderBy: { createdAt: "desc" },
      take,
    });

    const list = bets.map((b) => ({
      id: b.id,
      roundId: b.roundId,
      side: b.side,
      amount: b.amount,
      createdAt: b.createdAt.toISOString(),
      outcome: b.round?.outcome,
      result: b.round?.resultJson ? JSON.parse(b.round.resultJson) : null,
    }));

    return NextResponse.json({ bets: list });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "UNKNOWN_ERROR" }, { status: 500 });
  }
}
