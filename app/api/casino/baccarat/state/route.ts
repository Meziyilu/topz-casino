// app/api/casino/baccarat/state/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyJWT } from "@/lib/jwt";

type Phase = "BETTING" | "REVEAL" | "SETTLED";

export async function GET(req: NextRequest) {
  try {
    const roomCode = String(req.nextUrl.searchParams.get("room") || "R60").toUpperCase();

    // 1) 房間
    const room = await prisma.room.findFirst({ where: { code: roomCode } });
    if (!room) {
      return NextResponse.json({ error: "房間不存在" }, { status: 404 });
    }

    // 2) 最新一局（依你現有邏輯可替換）
    const round = await prisma.round.findFirst({
      where: { roomId: room.id },
      orderBy: [{ day: "desc" }, { roundSeq: "desc" }],
    });
    if (!round) {
      return NextResponse.json({ error: "目前沒有回合" }, { status: 404 });
    }

    // 3) 倒數/相位（這裡暫用假資料，之後接你的 scheduler）
    const secLeft = 10;
    const phase: Phase = (round.phase as Phase) || "BETTING";

    // 4) 近 10 局（路子）
    const recentRows = await prisma.round.findMany({
      where: { roomId: room.id, outcome: { not: null } },
      orderBy: [{ day: "desc" }, { roundSeq: "desc" }],
      take: 10,
      select: { roundSeq: true, outcome: true, playerTotal: true, bankerTotal: true },
    });
    const recentList = recentRows.map((r) => {
      return {
        roundSeq: r.roundSeq,
        outcome: r.outcome,
        p: r.playerTotal ?? 0,
        b: r.bankerTotal ?? 0,
      };
    });

    // 5) 使用者相關（myBets + wallet）
    let myBets: Record<string, number> = {};
    let walletInfo: { wallet: number; bank: number } | null = null;

    try {
      const token = req.cookies.get("token")?.value;
      if (token) {
        const payload = await verifyJWT(token);
        const userId = String(payload.sub);

        // 我的下注合計（本局）
        const bets = await prisma.bet.groupBy({
          by: ["side"],
          where: { roundId: round.id, userId },
          _sum: { amount: true },
        });
        for (const bet of bets) {
          myBets[bet.side] = bet._sum.amount ?? 0;
        }

        // 我的餘額（錢包 + 銀行）
        const me = await prisma.user.findUnique({
          where: { id: userId },
          select: { balance: true, bankBalance: true },
        });
        if (me) {
          walletInfo = { wallet: me.balance, bank: me.bankBalance };
        }
      }
    } catch {
      myBets = {};
      walletInfo = null;
    }

    // 6) 回傳
    const res = NextResponse.json({
      room: {
        code: room.code,
        name: room.name,
        durationSeconds: room.durationSeconds,
      },
      day: round.day,
      roundSeq: round.roundSeq,
      phase,
      secLeft,
      result: round.outcome
        ? {
            playerCards: (round.playerCards as any) || [],
            bankerCards: (round.bankerCards as any) || [],
            playerTotal: round.playerTotal ?? 0,
            bankerTotal: round.bankerTotal ?? 0,
            outcome: round.outcome,
            playerPair: !!round.playerPair,
            bankerPair: !!round.bankerPair,
            anyPair: !!round.anyPair,
            perfectPair: !!round.perfectPair,
          }
        : null,
      myBets,
      wallet: walletInfo, // 👈 登入則帶回 {wallet, bank}，未登入為 null
      recent: recentList,
    });
    // 防快取，避免狀態延遲
    res.headers.set("Cache-Control", "no-store, no-cache, max-age=0, must-revalidate");
    return res;
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}