// services/roulette.service.ts
import { prisma } from "@/lib/prisma";
import type { RouletteRoomCode } from "@prisma/client";
import { GameCode } from "@prisma/client";
import { loadRoomTimers, computePhase } from "@/lib/roulette/timers";
import { nextResult } from "@/lib/roulette/rng";
import { isValidKind, payoutMultiplier } from "@/lib/roulette/payout";

/** 取得或建立當前進行中的回合（不主動推進） */
export async function getOrCreateCurrentRound(room: RouletteRoomCode) {
  let round = await prisma.rouletteRound.findFirst({
    where: { room },
    orderBy: { startedAt: "desc" },
  });
  if (!round) {
    round = await prisma.rouletteRound.create({ data: { room, phase: "BETTING" } });
  }
  const timers = await loadRoomTimers(room);
  return { round, timers };
}

/** 依時間自動推進：BETTING → REVEALING(寫入 result) → SETTLED(派彩) → 自動開新局 */
async function ensureProgress(room: RouletteRoomCode, roundId: string) {
  const round = await prisma.rouletteRound.findUnique({ where: { id: roundId } });
  if (!round) return;

  const timers = await loadRoomTimers(room);
  const tm = computePhase(round.startedAt, timers);

  // 進入 REVEALING：若還沒寫結果→立即產出結果（不派彩）
  if (tm.phase === "REVEALING" && (round.result == null || round.phase !== "REVEALING")) {
    const res = nextResult().result;
    await prisma.rouletteRound.update({
      where: { id: round.id },
      data: { phase: "REVEALING", result: res },
    });
    return;
  }

  // 進入 SETTLED：派彩 + 結束 + 開新局
  if (tm.phase === "SETTLED" && round.phase !== "SETTLED") {
    const bets = await prisma.rouletteBet.findMany({ where: { roundId } });
    const result = round.result ?? nextResult().result;

    await prisma.$transaction(async (tx) => {
      await tx.rouletteRound.update({
        where: { id: roundId },
        data: { result, phase: "SETTLED", endedAt: new Date() },
      });

      for (const b of bets) {
        const mult = payoutMultiplier(b.kind as any, result);
        if (mult > 0) {
          const win = Math.floor(b.amount * (mult + 1)); // 含本金
          await tx.user.update({ where: { id: b.userId }, data: { balance: { increment: win } } });
          await tx.ledger.create({
            data: {
              type: "PAYOUT",
              amount: win,
              userId: b.userId,
              room,
              roundId,
              gameCode: GameCode.GLOBAL,
            },
          });
        }
      }

      await tx.rouletteRound.create({ data: { room, phase: "BETTING" } });
    });
  }
}

/** 下注 */
export async function placeBet(opts: {
  userId: string;
  room: RouletteRoomCode;
  kind: string;
  amount: number;
}) {
  if (!isValidKind(opts.kind)) throw new Error("INVALID_BET_KIND");
  if (opts.amount <= 0) throw new Error("INVALID_AMOUNT");

  const { round } = await getOrCreateCurrentRound(opts.room);
  await ensureProgress(opts.room, round.id);

  const cur = await prisma.rouletteRound.findUnique({ where: { id: round.id } });
  if (!cur) throw new Error("ROUND_GONE");

  const timers = await loadRoomTimers(opts.room);
  const tm = computePhase(cur.startedAt, timers);
  if (tm.phase !== "BETTING") throw new Error("NOT_IN_BETTING");

  const user = await prisma.user.findUnique({ where: { id: opts.userId }, select: { balance: true } });
  if (!user) throw new Error("USER_NOT_FOUND");
  if (user.balance < opts.amount) throw new Error("INSUFFICIENT_BALANCE");

  const bet = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: opts.userId },
      data: { balance: { decrement: opts.amount } },
    });
    await tx.ledger.create({
      data: {
        type: "BET_PLACED",
        amount: opts.amount,
        userId: opts.userId,
        room: opts.room,
        roundId: cur.id,
        gameCode: GameCode.GLOBAL,
      },
    });
    return tx.rouletteBet.create({
      data: { userId: opts.userId, roundId: cur.id, kind: opts.kind, amount: opts.amount },
    });
  });

  return { bet, roundId: cur.id };
}

/** 讀狀態（含倒數/我的當局下注） */
export async function getState(room: RouletteRoomCode, userId?: string) {
  const { round } = await getOrCreateCurrentRound(room);
  await ensureProgress(room, round.id);

  const latest = await prisma.rouletteRound.findFirst({
    where: { room },
    orderBy: { startedAt: "desc" },
  });
  if (!latest) throw new Error("ROUND_MISSING");

  const timers = await loadRoomTimers(room);
  const tm = computePhase(latest.startedAt, timers);

  const myBets = userId
    ? await prisma.rouletteBet.findMany({ where: { roundId: latest.id, userId } })
    : [];

  return {
    room,
    round: { id: latest.id, phase: tm.phase, startedAt: latest.startedAt, result: latest.result ?? null },
    timers: { lockInSec: tm.lockInSec, endInSec: tm.endInSec, revealWindowSec: timers.revealWindowSec },
    locked: tm.lockInSec <= 0,
    myBets,
  };
}

/** 歷史 */
export async function history(room: RouletteRoomCode, limit = 50) {
  return prisma.rouletteRound.findMany({
    where: { room },
    orderBy: { startedAt: "desc" },
    take: limit,
    select: { id: true, result: true, startedAt: true, endedAt: true },
  });
}

/** 管理：強制結算（可指定結果） */
export async function settleRound(roundId: string, forcedResult?: number) {
  const round = await prisma.rouletteRound.findUnique({ where: { id: roundId } });
  if (!round) throw new Error("ROUND_NOT_FOUND");

  const room = round.room;
  const result = typeof forcedResult === "number" ? forcedResult : round.result ?? nextResult().result;
  if (result < 0 || result > 36) throw new Error("BAD_RESULT");

  const bets = await prisma.rouletteBet.findMany({ where: { roundId } });

  await prisma.$transaction(async (tx) => {
    await tx.rouletteRound.update({
      where: { id: roundId },
      data: { result, phase: "SETTLED", endedAt: new Date() },
    });

    for (const b of bets) {
      const mult = payoutMultiplier(b.kind as any, result);
      if (mult > 0) {
        const win = Math.floor(b.amount * (mult + 1));
        await tx.user.update({ where: { id: b.userId }, data: { balance: { increment: win } } });
        await tx.ledger.create({
          data: {
            type: "PAYOUT",
            amount: win,
            userId: b.userId,
            room,
            roundId,
            gameCode: GameCode.GLOBAL,
          },
        });
      }
    }

    await tx.rouletteRound.create({ data: { room, phase: "BETTING" } });
  });

  return { result, count: bets.length };
}

/** 大廳/房內 HUD：本局概覽（我方、總額、筆數、唯一下注人數） */
export async function getOverview(room: RouletteRoomCode, userId?: string) {
  const { round } = await getOrCreateCurrentRound(room);
  await ensureProgress(room, round.id);

  const latest = await prisma.rouletteRound.findFirst({
    where: { room },
    orderBy: { startedAt: "desc" },
  });
  if (!latest) throw new Error("ROUND_MISSING");

  const [myAgg, totalAgg, uniques] = await Promise.all([
    userId
      ? prisma.rouletteBet.aggregate({
          _sum: { amount: true },
          where: { roundId: latest.id, userId },
        })
      : Promise.resolve(null),
    prisma.rouletteBet.aggregate({
      _sum: { amount: true },
      _count: { _all: true },
      where: { roundId: latest.id },
    }),
    prisma.rouletteBet.findMany({
      where: { roundId: latest.id },
      select: { userId: true },
      distinct: ["userId"],
    }),
  ]);

  return {
    room,
    roundId: latest.id,
    myTotal: myAgg?._sum.amount ?? 0,
    totalAmount: totalAgg._sum.amount ?? 0,
    totalBets: totalAgg._count._all ?? 0,
    uniqueUsers: uniques.length,
  };
}
