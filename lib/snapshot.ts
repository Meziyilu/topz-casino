import prisma from './prisma';
import { StatPeriod, RoomCode } from '@prisma/client';

export async function addUserSnapshotDelta(opts: {
  userId: string;
  period: StatPeriod;
  room?: RoomCode | null;
  gameBet?: bigint;
  gamePayout?: bigint;
  bonusIncome?: bigint;
  betsCount?: number;
  winsCount?: number;
  lossesCount?: number;
  netProfit?: bigint;
  windowStart: Date; // 外部計算好視窗
  windowEnd: Date;
}) {
  const { userId, period, room, windowStart, windowEnd, ...delta } = opts;
  return prisma.userStatSnapshot.upsert({
    where: { userId_period_windowStart_windowEnd_room: { userId, period, windowStart, windowEnd, room: room ?? null } },
    update: {
      gameBet: { increment: delta.gameBet ?? 0n },
      gamePayout: { increment: delta.gamePayout ?? 0n },
      bonusIncome: { increment: delta.bonusIncome ?? 0n },
      betsCount: { increment: delta.betsCount ?? 0 },
      winsCount: { increment: delta.winsCount ?? 0 },
      lossesCount: { increment: delta.lossesCount ?? 0 },
      netProfit: { increment: delta.netProfit ?? 0n }
    },
    create: {
      userId, period, room: room ?? null, windowStart, windowEnd,
      gameBet: delta.gameBet ?? 0n,
      gamePayout: delta.gamePayout ?? 0n,
      bonusIncome: delta.bonusIncome ?? 0n,
      betsCount: delta.betsCount ?? 0,
      winsCount: delta.winsCount ?? 0,
      lossesCount: delta.lossesCount ?? 0,
      netProfit: delta.netProfit ?? 0n
    }
  });
}