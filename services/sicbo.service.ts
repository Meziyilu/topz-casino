export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { SicBoRoomCode, SicBoPhase, SicBoBetKind } from "@prisma/client";
import prisma from "@/lib/prisma";
import { rollDice, validatePayload, settleOne } from "@/lib/sicbo";
import { taipeiNow } from "@/lib/time";

async function readInt(key: string, fallback: number) {
  const row = await prisma.gameConfig.findUnique({ where: { gameCode_key: { gameCode: "SICBO", key } } });
  return row?.valueInt ?? fallback;
}
async function readBool(key: string, fallback: boolean) {
  const row = await prisma.gameConfig.findUnique({ where: { gameCode_key: { gameCode: "SICBO", key } } });
  return (row?.valueBool ?? null) === null ? fallback : !!row?.valueBool;
}

export async function getRoomMeta(room: SicBoRoomCode) {
  const baseInterval = await readInt("drawIntervalSec", 30);
  const lock = await readInt("lockBeforeRollSec", 5);
  const roomKey = `room.${room}.drawIntervalSec`;
  const roomInterval = await readInt(roomKey, room === "SB_R60" ? 60 : room === "SB_R90" ? 90 : 30);
  const autoRotate = await readBool("autoRotate", true);
  return {
    drawIntervalSec: roomInterval || baseInterval,
    lockBeforeRollSec: lock,
    autoRotate,
  };
}

export async function getOrRotateRound(room: SicBoRoomCode) {
  const meta = await getRoomMeta(room);
  let round = await prisma.sicBoRound.findFirst({
    where: { room, phase: { in: [SicBoPhase.BETTING, SicBoPhase.REVEALING, SicBoPhase.SETTLED] } },
    orderBy: { startedAt: "desc" },
  });
  const now = taipeiNow();

  // 若沒有任何 round，直接開新局
  if (!round) {
    round = await prisma.sicBoRound.create({ data: { room, phase: SicBoPhase.BETTING, dice: [] } });
    return { round, meta, locked: false };
  }

  const elapsed = (now.getTime() - round.startedAt.getTime()) / 1000;
  const willLockAt = meta.drawIntervalSec - meta.lockBeforeRollSec;

  // BETTING → 到鎖盤點即進入 REVEALING（接著會結算）
  if (round.phase === SicBoPhase.BETTING && elapsed >= willLockAt) {
    round = await prisma.sicBoRound.update({ where: { id: round.id }, data: { phase: SicBoPhase.REVEALING } });
    round = await revealAndSettle(round.id);
  }

  // REVEALING → 執行結算
  if (round.phase === SicBoPhase.REVEALING) {
    round = await revealAndSettle(round.id);
  }

  // SETTLED → 僅在 autoRotate=true 才自動開新局
  if (round.phase === SicBoPhase.SETTLED && meta.autoRotate) {
    // 如果剛結束就立刻開下一局（不延遲）
    round = await prisma.sicBoRound.create({ data: { room, phase: SicBoPhase.BETTING, dice: [] } });
  }

  const locked = (() => {
    if (round.phase !== SicBoPhase.BETTING) return true;
    const nowElapsed = (taipeiNow().getTime() - round.startedAt.getTime()) / 1000;
    return nowElapsed >= willLockAt;
  })();

  return { round, meta, locked };
}

export async function revealAndSettle(roundId: string) {
  const round = await prisma.sicBoRound.findUnique({ where: { id: roundId } });
  if (!round) throw new Error("ROUND_NOT_FOUND");
  if (round.phase === SicBoPhase.SETTLED && round.dice.length === 3) return round;

  const dice = round.dice.length === 3 ? (round.dice as any) : rollDice();
  const bets = await prisma.sicBoBet.findMany({ where: { roundId } });

  for (const b of bets) {
    const payload = validatePayload(b.kind as SicBoBetKind, b.payload);
    const { payout } = settleOne(b.kind as SicBoBetKind, b.amount, payload, dice);
    if (payout > 0) {
      await prisma.ledger.create({
        data: {
          userId: b.userId,
          type: "PAYOUT",
          target: "WALLET",
          amount: payout,
          sicboRoom: round.room,
          sicboRoundId: round.id,
        },
      });
      await prisma.user.update({
        where: { id: b.userId },
        data: {
          balance: { increment: payout },
          totalPayout: { increment: BigInt(payout) },
          netProfit: { increment: BigInt(payout) },
        },
      });
    }
  }

  return await prisma.sicBoRound.update({
    where: { id: roundId },
    data: { phase: SicBoPhase.SETTLED, dice: dice as any, endedAt: taipeiNow() },
  });
}

export async function placeBet(params: {
  userId: string;
  room: SicBoRoomCode;
  kind: SicBoBetKind;
  amount: number;
  payload?: any;
}) {
  const { userId, room, kind, amount, payload } = params;

  const min = await readInt("bet.min", 10);
  const max = await readInt("bet.max", 100000);
  const totalMax = await readInt("bet.totalMaxPerRound", 1000000);

  if (amount < min || amount > max) throw new Error("BET_OUT_OF_RANGE");

  const { round } = await getOrRotateRound(room);
  if (round.phase !== SicBoPhase.BETTING) throw new Error("ROUND_LOCKED");

  const me = await prisma.user.findUnique({ where: { id: userId } });
  if (!me) throw new Error("USER_NOT_FOUND");
  if (me.isBanned) throw new Error("USER_BANNED");
  if (me.balance < amount) throw new Error("INSUFFICIENT_BALANCE");

  const normalized = validatePayload(kind, payload);

  const bet = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        balance: { decrement: amount },
        totalBets: { increment: 1 },
        totalStaked: { increment: BigInt(amount) },
        netProfit: { decrement: BigInt(amount) },
      },
    });
    await tx.ledger.create({
      data: {
        userId,
        type: "BET_PLACED",
        target: "WALLET",
        amount: -amount,
        sicboRoom: room,
        sicboRoundId: round.id,
      },
    });
    return await tx.sicBoBet.create({
      data: { userId, roundId: round.id, kind, amount, payload: normalized as any },
    });
  });

  return { round, bet };
}

export async function getHistory(room: SicBoRoomCode, limit = 30) {
  return await prisma.sicBoRound.findMany({
    where: { room, phase: SicBoPhase.SETTLED },
    orderBy: { endedAt: "desc" },
    take: limit,
  });
}
