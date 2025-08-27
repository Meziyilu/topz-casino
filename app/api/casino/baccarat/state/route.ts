// app/api/casino/baccarat/state/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { PrismaClient } from "@prisma/client";

// 依你的專案：把目前的回合、倒數等邏輯接在 getCurrentRound 上
async function getCurrentRound(roomCode: string) {
  const room = await prisma.room.findFirst({ where: { code: roomCode as any } });
  if (!room) throw new Error("房間不存在");
  const round = await prisma.round.findFirst({
    where: { roomId: room.id },
    orderBy: [{ day: "desc" }, { roundSeq: "desc" }],
  });
  if (!round) throw new Error("目前沒有回合");
  return { room, round };
}

// 派彩係數
function payoutFactor(side: string, outcome: string, flags: {
  playerPair?: boolean; bankerPair?: boolean; anyPair?: boolean; perfectPair?: boolean;
}) {
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

// 真正的結算：REVEAL 結束 → 結算 → SETTLED
async function settleRound(tx: PrismaClient, roundId: string) {
  const round = await tx.round.findUnique({ where: { id: roundId } });
  if (!round) throw new Error("回合不存在");
  if (round.settledAt) return; // 已結算過
  if (round.phase !== "REVEAL" && round.phase !== "SETTLED") {
    // 只允許在 REVEAL 結束時結算（若外部先切到 SETTLED 也跳過）
    throw new Error("回合尚未到結算階段");
  }

  const flags = {
    playerPair: round.playerPair || false,
    bankerPair: round.bankerPair || false,
    anyPair: round.anyPair || false,
    perfectPair: round.perfectPair || false,
  };

  const bets = await tx.bet.findMany({
    where: { roundId: round.id },
    select: { id:true, userId:true, side:true, amount:true }
  });

  // 逐筆派彩（把贏家返還：stake*factor；輸家 0，已在下注時扣款）
  for (const b of bets) {
    const factor = payoutFactor(b.side as any, String(round.outcome), flags);
    if (factor <= 0) continue; // 輸：不返還

    const credit = Math.floor(b.amount * factor);
    const updated = await tx.user.update({
      where: { id: b.userId },
      data: { balance: { increment: credit } },
      select: { balance:true, bankBalance:true }
    });

    await tx.ledger.create({
      data: {
        userId: b.userId,
        type: "BET_PAYOUT",
        target: "WALLET",
        delta: credit, // 中獎/和局返還（含本金）
        memo: `派彩 ${b.side} (round #${round.roundSeq})`,
        balanceAfter: updated.balance,
        bankAfter: updated.bankBalance,
      }
    });
  }

  // 標記結算完成
  await tx.round.update({
    where: { id: round.id },
    data: { settledAt: new Date(), phase: "SETTLED" }
  });
}

export async function GET(req: NextRequest) {
  try {
    const roomCode = String(req.nextUrl.searchParams.get("room") || "R60").toUpperCase();
    const { room, round } = await getCurrentRound(roomCode);

    // 你原來的計時/相位切換邏輯：這裡示意
    // 假設你會計算 secLeft 與 phase，如果「REVEAL 且該到結算」：
    let secLeft = 5; // TODO: 用你原本的邏輯算
    let phase = round.phase as "BETTING"|"REVEAL"|"SETTLED";

    // 若在 REVEAL，且時間到 & 尚未 settled，做結算（防重入）
    if (phase === "REVEAL" && !round.settledAt && secLeft <= 0) {
      await prisma.$transaction(async (tx: PrismaClient) => {
        // 重新讀取最新 round（避免併發）
        const r = await tx.round.findUnique({ where: { id: round.id } });
        if (r && !r.settledAt) {
          await settleRound(tx, r.id);
        }
      });

      // 重新抓 round 狀態
      const refreshed = await prisma.round.findUnique({ where: { id: round.id } });
      phase = (refreshed?.phase || "SETTLED") as any;
    }

    // ===== 回傳給前端需要的資料（請依你原本格式調整） =====
    // 近 10 局（做路子）
    const recent = await prisma.round.findMany({
      where: { roomId: room.id, outcome: { not: null } },
      orderBy: [{ day:"desc" }, { roundSeq:"desc" }],
      take: 10,
      select: { roundSeq:true, outcome:true, playerTotal:true, bankerTotal:true }
    });

    return NextResponse.json({
      room: { code: room.code, name: room.name, durationSeconds: room.durationSeconds },
      day: round.day,
      roundSeq: round.roundSeq,
      phase,
      secLeft,
      result: round.outcome ? {
        playerCards: (round.playerCards as any) || [],
        bankerCards: (round.bankerCards as any) || [],
        playerTotal: round.playerTotal ?? 0,
        bankerTotal: round.bankerTotal ?? 0,
        outcome: round.outcome,
        playerPair: round.playerPair ?? false,
        bankerPair: round.bankerPair ?? false,
        anyPair: round.anyPair ?? false,
        perfectPair: round.perfectPair ?? false,
      } : null,
      myBets: {}, // TODO: 可補：聚合目前登入者的該局投注
      recent: recent.map(r => ({
        roundSeq: r.roundSeq,
        outcome: r.outcome,
        p: r.playerTotal ?? 0,
        b: r.bankerTotal ?? 0,
      })),
    });
  } catch (e:any) {
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
  }
}
