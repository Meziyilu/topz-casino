// app/api/casino/baccarat/state/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyJWT } from "@/lib/jwt";

type Phase = "BETTING" | "REVEAL" | "SETTLED";

export async function GET(req: NextRequest) {
  try {
    const roomCode = String(req.nextUrl.searchParams.get("room") || "R60").toUpperCase();

    // 房間
    const room = await prisma.room.findFirst({ where: { code: roomCode } });
    if (!room) {
      return NextResponse.json({ error: "房間不存在" }, { status: 404 });
    }

    // 最新一局（請依你的實作調整）
    const round = await prisma.round.findFirst({
      where: { roomId: room.id },
      orderBy: [{ day: "desc" }, { roundSeq: "desc" }]
    });
    if (!round) {
      return NextResponse.json({ error: "目前沒有回合" }, { status: 404 });
    }

    // 倒數/相位（這裡先放假資料，請用你的時計邏輯替換）
    const secLeft = 10;
    const phase = (round.phase as Phase) || "BETTING";

    // 近 10 局（路子）
    const recentRows = await prisma.round.findMany({
      where: { roomId: room.id, outcome: { not: null } },
      orderBy: [{ day: "desc" }, { roundSeq: "desc" }],
      take: 10,
      select: { roundSeq: true, outcome: true, playerTotal: true, bankerTotal: true }
    });

    // 我的下注合計（登入才查）
    let myBets: Record<string, number> = {};
    try {
      const token = req.cookies.get("token")?.value;
      if (token) {
        const payload = await verifyJWT(token);
        const userId = String(payload.sub);
        const bets = await prisma.bet.groupBy({
          by: ["side"],
          where: { roundId: round.id, userId },
          _sum: { amount: true }
        });
        for (const row of bets) {
          // row._sum.amount 可能是 number | null
          myBets[row.side] = row._sum.amount != null ? row._sum.amount : 0;
        }
      }
    } catch {
      // 未登入就維持空物件
      myBets = {};
    }

    // 回應
    return NextResponse.json({
      room: { code: room.code, name: room.name, durationSeconds: room.durationSeconds },
      day: round.day,
      roundSeq: round.roundSeq,
      phase,
      secLeft,
      result: round.outcome
        ? {
            playerCards: (round.playerCards as any) || [],
            bankerCards: (round.bankerCards as any) || [],
            playerTotal: round.playerTotal != null ? round.playerTotal : 0,
            bankerTotal: round.bankerTotal != null ? round.bankerTotal : 0,
            outcome: round.outcome,
            playerPair: !!round.playerPair,
            bankerPair: !!round.bankerPair,
            anyPair: !!round.anyPair,
            perfectPair: !!round.perfectPair
          }
        : null,
      myBets,
      recent: recentRows.map((row) => ({
        roundSeq: row.roundSeq,
        outcome: row.outcome,
        p: row.playerTotal != null ? row.playerTotal : 0,
        b: row.bankerTotal != null ? row.bankerTotal : 0
      }))
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
