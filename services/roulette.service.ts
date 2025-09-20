// services/roulette.service.ts
import { prisma } from "@/lib/prisma";
import { GameCode, RouletteRoomCode, RouletteBetKind, SicBoPhase } from "@prisma/client";
import { loadRoomTimers, computePhase } from "@/lib/roulette/timers";
import { nextResult } from "@/lib/roulette/rng";
import { isValidKind, payoutMultiplier } from "@/lib/roulette/payout";

export async function ensureRouletteRound(room: RouletteRoomCode) {
  const last = await prisma.rouletteRound.findFirst({
    where: { room },
    orderBy: { startedAt: "desc" },
  });

  const timers = await loadRoomTimers(room);

  if (!last) {
    return prisma.rouletteRound.create({
      data: {
        room,
        phase: SicBoPhase.BETTING,
        startedAt: new Date(),
      },
    });
  }

  const tm = computePhase(last.startedAt, timers);

  // 進入下注期
  if (tm === SicBoPhase.BETTING && last.phase !== SicBoPhase.BETTING) {
    return prisma.rouletteRound.create({
      data: {
        room,
        phase: SicBoPhase.BETTING,
        startedAt: new Date(),
      },
    });
  }

  // 進入開獎期：若還沒寫結果 → 立即產出結果（不派彩）
  if (tm === SicBoPhase.REVEALING && (last.result == null || last.phase !== SicBoPhase.REVEALING)) {
    const res = nextResult().result;
    await prisma.rouletteRound.update({
      where: { id: last.id },
      data: {
        phase: SicBoPhase.REVEALING,
        result: res,
        endedAt: new Date(),
      },
    });
  }

  // 進入結算期：結算派彩
  if (tm === SicBoPhase.SETTLED && last.phase !== SicBoPhase.SETTLED) {
    if (last.result == null) {
      const res = nextResult().result;
      await prisma.rouletteRound.update({
        where: { id: last.id },
        data: { result: res },
      });
    }

    const result = last.result!;
    const bets = await prisma.rouletteBet.findMany({ where: { roundId: last.id } });

    for (const bet of bets) {
      if (!isValidKind(bet.kind)) continue;
      const multiplier = payoutMultiplier(bet.kind, bet.payload, result);
      if (multiplier > 0) {
        const payout = bet.amount * multiplier;
        await prisma.ledger.create({
          data: {
            userId: bet.userId,
            type: "PAYOUT",
            target: "WALLET",
            amount: payout,
            meta: { game: GameCode.ROULETTE, roundId: last.id, betId: bet.id },
          },
        });
      }
    }

    await prisma.rouletteRound.update({
      where: { id: last.id },
      data: { phase: SicBoPhase.SETTLED },
    });
  }

  return last;
}

export async function placeRouletteBet(
  userId: string,
  room: RouletteRoomCode,
  kind: RouletteBetKind,
  amount: number,
  payload: any
) {
  const round = await ensureRouletteRound(room);

  if (round.phase !== SicBoPhase.BETTING) {
    throw new Error("Not in betting phase");
  }

  return prisma.rouletteBet.create({
    data: {
      userId,
      roundId: round.id,
      kind,
      amount,
      payload,
    },
  });
}
