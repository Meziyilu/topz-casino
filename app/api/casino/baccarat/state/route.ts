// app/api/casino/baccarat/state/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyJWT } from "@/lib/jwt";
import { Prisma } from "@prisma/client";

type Phase = "BETTING" | "REVEAL" | "SETTLED";

function payoutFactor(
  side: string,
  outcome: string,
  flags: { playerPair?: boolean; bankerPair?: boolean; anyPair?: boolean; perfectPair?: boolean }
) {
  switch (side) {
    case "PLAYER":       return outcome === "PLAYER" ? 2.0 : (outcome === "TIE" ? 1.0 : 0);
    case "BANKER":       return outcome === "BANKER" ? 1.95 : (outcome === "TIE" ? 1.0 : 0);
    case "TIE":          return outcome === "TIE" ? 9.0 : 0;
    case "PLAYER_PAIR":  return flags.playerPair ? 12.0 : 0;
    case "BANKER_PAIR":  return flags.bankerPair ? 12.0 : 0;
    case "ANY_PAIR":     return flags.anyPair ? 6.0 : 0;
    case "PERFECT_PAIR": return flags.perfectPair ? 26.0 : 0;
    default:             return 0;
  }
}

// 真正的結算：REVEAL 結束 → 結算 → SETTLED（防重入）
async function settleRound(tx: Prisma.TransactionClient, roundId: string) {
  const r = await tx.round.findUnique({ where: { id: roundId } });
  if (!r) throw new Error("回合不存在");
  if (r.settledAt) return; // 已結算
  if (r.phase !== "REVEAL" && r.phase !== "SETTLED") {
    throw new Error("回合尚未到結算階段");
  }

  const flags = {
    playerPair: !!r.playerPair,
    bankerPair: !!r.bankerPair,
    anyPair: !!r.anyPair,
    perfectPair: !!r.perfectPair,
  };

  const bets = await tx.bet.findMany({
    where: { roundId: r.id },
    select: { id: true, userId: true, side: true, amount: true }
  });

  for (const b of bets) {
    const factor = payoutFactor(b.side as any, String(r.outcome), flags);
    if (factor <= 0) continue; // 輸掉：下注時已扣款，無返還

    const credit = Math.floor(b.amount * factor);
    const updated = await tx.user.update({
      where: { id: b.userId },
      data: { balance: { increment: credit } },
      select: { balance: true, bankBalance: true }
    });

    await tx.ledger.create({
      data: {
        userId: b.userId,
        type: "BET_PAYOUT",
        target: "WALLET",           // ✅ 派彩一律加到錢包
        delta: credit,              // 含本金（視 factor 定義）
        memo: `派彩 ${b.side} (round #${r.roundSeq})`,
        balanceAfter: updated.balance,
        bankAfter: updated.bankBalance,
      }
    });
  }

  await tx.round.update({
    where: { id: r.id },
    data: { settledAt: new Date(), phase: "SETTLED" }
  });
}

export async function GET(req: NextRequest) {
  try {
    const roomCode = String(req.nextUrl.searchParams.get("room") || "R60").toUpperCase();

    // 房間
    const room = await prisma.room.findFirst({ where: { code: roomCode } });
    if (!room) {
      return NextResponse.json({ error: "房間不存在" }, { status: 404 });
    }

    // 最新一局
    const round = await prisma.round.findFirst({
      where: { roomId: room.id },
      orderBy: [{ day: "desc" }, { roundSeq: "desc" }],
    });
    if (!round) {
      return NextResponse.json({ error: "目前沒有回合" }, { status: 404 });
    }

    // 你的時計/換相位邏輯（這裡先簡化）
    let phase: Phase = (round.phase as Phase) || "BETTING";
    let secLeft = 5; // TODO: 以 room.durationSeconds 與 round 的時間戳計算

    // 若 REVEAL & 時間到 & 未 settled → 自動結算（交易內再次判斷避免重入）
    if (phase === "REVEAL" && !round.settledAt && secLeft <= 0) {
      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const fresh = await tx.round.findUnique({ where: { id: round.id } });
        if (fresh && !fresh.settledAt) {
          await settleRound(tx, fresh.id);
        }
      });
      // 重新抓最新狀態
      const refreshed = await prisma.round.findUnique({ where: { id: round.id } });
      phase = (refreshed?.phase as Phase) || "SETTLED";
    }

    // 近10局（路子）
    const recentRows = await prisma.round.findMany({
      where: { roomId: room.id, outcome: { not: null } },
      orderBy: [{ day: "desc" }, { roundSeq: "desc" }],
      take: 10,
      select: { roundSeq: true, outcome: true, playerTotal: true, bankerTotal: true },
    });

    const recentList = recentRows.map((rc) => {
      return {
        roundSeq: rc.roundSeq,
        outcome: rc.outcome,
        p: rc.playerTotal ?? 0,
        b: rc.bankerTotal ?? 0,
      };
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
          _sum: { amount: true },
        });
        const agg: Record<string, number> = {};
        for (const gb of bets) {
          agg[gb.side] = gb._sum.amount ?? 0;
        }
        myBets = agg;
      }
    } catch {
      myBets = {};
    }

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
      recent: recentList,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
