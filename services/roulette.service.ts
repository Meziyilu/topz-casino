// services/roulette.service.ts
import { prisma } from '@/lib/prisma';
import type { RouletteRoomCode } from '@prisma/client';
import { loadRoomTimers, computePhase } from '@/lib/roulette/timers';
import { nextResult } from '@/lib/roulette/rng';
import { isValidKind, payoutMultiplier } from '@/lib/roulette/payout';

export async function getOrCreateCurrentRound(room: RouletteRoomCode) {
  const timers = await loadRoomTimers(room);

  let round = await prisma.rouletteRound.findFirst({
    where: { room },
    orderBy: { startedAt: 'desc' },
  });

  if (!round) {
    round = await prisma.rouletteRound.create({ data: { room, phase: 'BETTING' } });
  }

  return { round, timers };
}

// 依時間自動推進：BETTING → (到時) REVEALING(寫入 result) → (到時) SETTLED + 派彩 + 開新局
async function ensureProgress(room: RouletteRoomCode, roundId: string) {
  const round = await prisma.rouletteRound.findUnique({ where: { id: roundId } });
  if (!round) return;

  const timers = await loadRoomTimers(room);
  const tm = computePhase(round.startedAt, timers);

  // 進入 REVEALING：若還沒寫 result，立即產生結果（不派彩）
  if (tm.phase === 'REVEALING' && (round.result == null || round.phase !== 'REVEALING')) {
    const res = nextResult().result;
    await prisma.rouletteRound.update({
      where: { id: round.id },
      data: { phase: 'REVEALING', result: res }, // 揭示期間前端有結果可播動畫
    });
    return;
  }

  // 結束 REVEALING → 派彩 + SETTLED → 立刻開下一局
  if (tm.phase === 'SETTLED' && round.phase !== 'SETTLED') {
    const bets = await prisma.rouletteBet.findMany({ where: { roundId } });
    const result = round.result ?? nextResult().result;

    await prisma.$transaction(async (tx) => {
      // 對齊結果與結束
      await tx.rouletteRound.update({
        where: { id: roundId },
        data: { result, phase: 'SETTLED', endedAt: new Date() },
      });

      // 逐筆派彩（含本金）
      for (const b of bets) {
        const mult = payoutMultiplier(b.kind as any, result);
        if (mult > 0) {
          const win = Math.floor(b.amount * (mult + 1));
          await tx.user.update({ where: { id: b.userId }, data: { balance: { increment: win } } });
          await tx.ledger.create({
            data: {
              type: 'PAYOUT',
              amount: win,
              userId: b.userId,
              room,
              roundId,
              gameCode: 'ROULETTE',
            },
          });
        }
      }

      // 自動開下一局
      await tx.rouletteRound.create({ data: { room, phase: 'BETTING' } });
    });
    return;
  }
}

export async function placeBet(opts: {
  userId: string;
  room: RouletteRoomCode;
  kind: string;
  amount: number;
}) {
  if (!isValidKind(opts.kind)) throw new Error('INVALID_BET_KIND');
  if (opts.amount <= 0) throw new Error('INVALID_AMOUNT');

  const { round, timers } = await getOrCreateCurrentRound(opts.room);
  // 下注前先推進（避免跨相位殘留）
  await ensureProgress(opts.room, round.id);

  const cur = await prisma.rouletteRound.findUnique({ where: { id: round.id } });
  if (!cur) throw new Error('ROUND_GONE');

  const tm = computePhase(cur.startedAt, await loadRoomTimers(opts.room));
  if (tm.phase !== 'BETTING') throw new Error('NOT_IN_BETTING');

  const user = await prisma.user.findUnique({ where: { id: opts.userId }, select: { balance: true } });
  if (!user) throw new Error('USER_NOT_FOUND');
  if (user.balance < opts.amount) throw new Error('INSUFFICIENT_BALANCE');

  const bet = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: opts.userId },
      data: { balance: { decrement: opts.amount } },
    });
    await tx.ledger.create({
      data: {
        type: 'BET_PLACED',
        amount: opts.amount,
        userId: opts.userId,
        room: opts.room,
        roundId: cur.id,
        gameCode: 'ROULETTE',
      },
    });
    return tx.rouletteBet.create({
      data: {
        userId: opts.userId,
        roundId: cur.id,
        kind: opts.kind,
        amount: opts.amount,
      },
    });
  });

  return { bet, roundId: cur.id };
}

export async function getState(room: RouletteRoomCode, userId?: string) {
  // 確保存在一局
  const { round } = await getOrCreateCurrentRound(room);
  // 自動推進（若需要）
  await ensureProgress(room, round.id);

  // 取最新一局（可能剛剛已開新局）
  const latest = await prisma.rouletteRound.findFirst({
    where: { room },
    orderBy: { startedAt: 'desc' },
  });
  if (!latest) throw new Error('ROUND_MISSING');

  const timers = await loadRoomTimers(room);
  const tm = computePhase(latest.startedAt, timers);

  const myBets = userId
    ? await prisma.rouletteBet.findMany({ where: { roundId: latest.id, userId } })
    : [];

  return {
    room,
    round: {
      id: latest.id,
      phase: tm.phase,
      startedAt: latest.startedAt,
      result: latest.result ?? null,
    },
    timers: { lockInSec: tm.lockInSec, endInSec: tm.endInSec, revealWindowSec: timers.revealWindowSec },
    locked: tm.lockInSec <= 0,
    myBets,
  };
}

export async function history(room: RouletteRoomCode, limit = 50) {
  return prisma.rouletteRound.findMany({
    where: { room },
    orderBy: { startedAt: 'desc' },
    take: limit,
    select: { id: true, result: true, startedAt: true, endedAt: true },
  });
}

// services/roulette.service.ts（新增）
export async function getOverview(room: RouletteRoomCode, userId?: string) {
  // 確保目前一局存在並自動推進
  const { round } = await getOrCreateCurrentRound(room);
  await ensureProgress(room, round.id);

  // 取得最新一局（可能剛剛已開新局）
  const latest = await prisma.rouletteRound.findFirst({
    where: { room },
    orderBy: { startedAt: 'desc' },
  });
  if (!latest) throw new Error('ROUND_MISSING');

  const [myTotalRow, totalAgg, uniqueUsers] = await Promise.all([
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
    // 以 distinct 統計唯一下注人數
    prisma.rouletteBet.findMany({
      where: { roundId: latest.id },
      select: { userId: true },
      distinct: ['userId'],
    }),
  ]);

  const myTotal = myTotalRow?._sum.amount ?? 0;
  const totalAmount = totalAgg._sum.amount ?? 0;
  const totalBets = totalAgg._count._all ?? 0;
  const uniqueUserCount = uniqueUsers.length;

  return {
    room,
    roundId: latest.id,
    myTotal,
    totalAmount,
    totalBets,
    uniqueUsers: uniqueUserCount,
  };
}
