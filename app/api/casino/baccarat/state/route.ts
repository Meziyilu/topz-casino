// app/api/casino/baccarat/state/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import prisma from "@/lib/prisma";
import { dealRound } from "@/lib/baccarat";
import { calcTiming } from "@/lib/gameclock";
import { noStoreJson } from "@/lib/http";

type Room = "R30" | "R60" | "R90";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const room = (searchParams.get("room") as Room) || "R60";

  const now = new Date();
  const { cfg, roundNo, startedAt, revealAt, lockAt, locked, shouldReveal } = calcTiming(room, now);

  let round = await prisma.baccaratRound.findFirst({ where: { room, roundNo } });

  if (!round) {
    round = await prisma.baccaratRound.create({
      data: { room, roundNo, phase: "BETTING", playerCards: [], bankerCards: [], startedAt, lockAt, revealAt },
    });
  }

  if (shouldReveal && round.phase !== "SETTLED") {
    const dealt = dealRound();
    round = await prisma.baccaratRound.update({
      where: { id: round.id },
      data: {
        phase: "SETTLED",
        playerCards: dealt.playerCards,
        bankerCards: dealt.bankerCards,
        outcome: dealt.outcome,
        playerPair: dealt.playerPair,
        bankerPair: dealt.bankerPair,
        anyPair: dealt.anyPair,
        perfectPair: dealt.perfectPair,
        usedNoCommission: dealt.usedNoCommission,
        settledAt: new Date(),
      },
    });
  } else if (locked && round.phase === "BETTING") {
    round = await prisma.baccaratRound.update({ where: { id: round.id }, data: { phase: "REVEALING" } });
  }

  const status = round.phase === "BETTING" ? "OPEN" : round.phase === "REVEALING" ? "LOCKED" : "SETTLED";

  return noStoreJson({
    serverTime: now.toISOString(),
    config: {
      drawIntervalSec: cfg.drawIntervalSec,
      lockBeforeDrawSec: cfg.lockBeforeRevealSec, // 與 1.1.1 命名相容
      payouts: { PLAYER: 1, BANKER: 1, TIE: 8, PLAYER_PAIR: 11, BANKER_PAIR: 11 },
      noCommissionOnBanker6: true,
    },
    current: {
      id: round.id,
      code: round.roundNo,
      drawAt: round.revealAt?.toISOString(),
      status,
      pairs: {
        playerPair: round.playerPair,
        bankerPair: round.bankerPair,
        anyPair: round.anyPair,
        perfectPair: round.perfectPair,
      },
      usedNoCommission: round.usedNoCommission,
      // 下面是 1.1.1 兼容 placeholder（不用也不影響）
      numbers: [],
      special: null,
      pool: 0,
      jackpot: 0,
    },
    locked,
  });
}
