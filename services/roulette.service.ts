// services/roulette.service.ts
import { prisma } from '@/lib/prisma';
import type { RouletteRoomCode } from '@prisma/client';
import { GameCode } from '@prisma/client'; // ⬅ 新增：引入 enum
import { loadRoomTimers, computePhase } from '@/lib/roulette/timers';
import { nextResult } from '@/lib/roulette/rng';
import { isValidKind, payoutMultiplier } from '@/lib/roulette/payout';

// ……(原本內容保留)

export async function placeBet(opts: {
  userId: string;
  room: RouletteRoomCode;
  kind: string;
  amount: number;
}) {
  // ……(原本驗證保留)

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
        gameCode: GameCode.GLOBAL, // ⬅ 這裡改成 enum
      },
    });
    return tx.rouletteBet.create({
      data: { userId: opts.userId, roundId: cur.id, kind: opts.kind, amount: opts.amount },
    });
  });

  return { bet, roundId: cur.id };
}

// ensureProgress 內的派彩 ledger 也改：
/*
await tx.ledger.create({
  data: {
    type: 'PAYOUT',
    amount: win,
    userId: b.userId,
    room,
    roundId,
    gameCode: GameCode.GLOBAL, // ⬅ 這裡也改
  },
});
*/

// ✅ 新增並匯出：管理用強制結算（可指定結果）
export async function settleRound(roundId: string, forcedResult?: number) {
  const round = await prisma.rouletteRound.findUnique({ where: { id: roundId } });
  if (!round) throw new Error('ROUND_NOT_FOUND');

  const room = round.room;
  const result = typeof forcedResult === 'number' ? forcedResult : (round.result ?? nextResult().result);
  if (result < 0 || result > 36) throw new Error('BAD_RESULT');

  const bets = await prisma.rouletteBet.findMany({ where: { roundId } });

  await prisma.$transaction(async (tx) => {
    // 更新結果 + 結束
    await tx.rouletteRound.update({
      where: { id: roundId },
      data: { result, phase: 'SETTLED', endedAt: new Date() },
    });

    // 派彩（含本金）
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
            gameCode: GameCode.GLOBAL, // ⬅ 同步使用 enum
          },
        });
      }
    }

    // 立刻開下一局
    await tx.rouletteRound.create({ data: { room, phase: 'BETTING' } });
  });

  return { result, count: bets.length };
}
