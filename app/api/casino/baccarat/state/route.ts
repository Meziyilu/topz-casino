import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { dealRound } from "@/lib/baccarat"; // 出牌邏輯

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const roomCode = searchParams.get("room");
    if (!roomCode) {
      return NextResponse.json({ error: "缺少房間代碼" }, { status: 400 });
    }

    const room = await prisma.room.findUnique({ where: { code: roomCode } });
    if (!room) {
      return NextResponse.json({ error: "房間不存在" }, { status: 404 });
    }

    // 找最新一局
    let round = await prisma.round.findFirst({
      where: { roomId: room.id },
      orderBy: { roundSeq: "desc" },
    });

    // 若沒有，建立第一局
    if (!round) {
      round = await prisma.round.create({
        data: {
          id: crypto.randomUUID(),
          roomId: room.id,
          day: new Date(),
          roundSeq: 1,
          phase: "BETTING",
          startedAt: new Date(),
          createdAt: new Date(),
        },
      });
    }

    const now = new Date();
    const elapsed = (now.getTime() - round.startedAt.getTime()) / 1000;
    let secLeft = Math.max(0, room.durationSeconds - Math.floor(elapsed));

    // ---------- 自動結算 ----------
    if (round.phase === "BETTING" && elapsed >= room.durationSeconds) {
      const result = dealRound(); // { playerCards, bankerCards, outcome, playerTotal, bankerTotal }

      await prisma.$transaction(async (tx) => {
        // 更新 round
        await tx.round.update({
          where: { id: round!.id },
          data: {
            phase: "SETTLED",
            outcome: result.outcome,
            playerTotal: result.playerTotal,
            bankerTotal: result.bankerTotal,
            playerCards: result.playerCards as any,
            bankerCards: result.bankerCards as any,
            settledAt: new Date(),
          },
        });

        // 找出該局所有下注
        const bets = await tx.bet.findMany({
          where: { roomId: room.id, roundSeq: round!.roundSeq },
        });

        for (const b of bets) {
          let payout = 0;
          if (b.side === result.outcome) {
            if (b.side === "PLAYER") payout = b.amount * 2;
            else if (b.side === "BANKER") payout = b.amount * 1.95; // 抽水
            else if (b.side === "TIE") payout = b.amount * 8;
          }
          if (payout > 0) {
            const u = await tx.user.update({
              where: { id: b.userId },
              data: { balance: { increment: payout } },
            });
            await tx.ledger.create({
              data: {
                userId: b.userId,
                type: "PAYOUT",
                target: b.side,
                delta: payout,
                memo: `派彩 ${b.side} (房間 ${room.code} #${round!.roundSeq})`,
                balanceAfter: u.balance,
              },
            });
          }
        }
      });

      // 更新為最新資料
      round = await prisma.round.findUnique({ where: { id: round.id } });
      secLeft = 0;
    }

    // ---------- 自動開新局 ----------
    if (round.phase === "SETTLED" && round.settledAt) {
      const nextRound = await prisma.round.findFirst({
        where: { roomId: room.id, roundSeq: { gt: round.roundSeq } },
      });
      if (!nextRound) {
        round = await prisma.round.create({
          data: {
            id: crypto.randomUUID(),
            roomId: room.id,
            day: new Date(),
            roundSeq: round.roundSeq + 1,
            phase: "BETTING",
            startedAt: new Date(),
            createdAt: new Date(),
          },
        });
        secLeft = room.durationSeconds;
      }
    }

    // 我的投注
    const me = await getUserFromRequest(req);
    let myBets: Record<string, number> = {};
    if (me) {
      const bets = await prisma.bet.findMany({
        where: { userId: me.id, roomId: room.id, roundSeq: round.roundSeq },
      });
      for (const b of bets) {
        myBets[b.side] = (myBets[b.side] ?? 0) + b.amount;
      }
    }

    return NextResponse.json({
      room: { code: room.code, name: room.name, durationSeconds: room.durationSeconds },
      day: round.day,
      roundSeq: round.roundSeq,
      phase: round.phase,
      secLeft,
      result: round.phase === "SETTLED"
        ? {
            playerTotal: round.playerTotal,
            bankerTotal: round.bankerTotal,
            outcome: round.outcome,
          }
        : null,
      myBets,
      recent: [], // 可以額外補上「近十局結果」
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "伺服器錯誤" }, { status: 500 });
  }
}
