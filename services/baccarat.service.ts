// services/baccarat.service.ts
import { prisma } from "@/lib/prisma";
import type {
  RoomCode,
  RoundPhase,
  BetSide,
  LedgerType,
  BalanceTarget,
} from "@prisma/client";

/** 前端/路由會送進來的下注資料型別（side 必填） */
export type BetInput = {
  side: BetSide;
  amount: number; // 正整數
};

/** 先用常數描述房間；之後可改查 DB */
const ROOMS: { code: RoomCode; name: string; minBet: number; maxBet: number }[] = [
  { code: "R30", name: "R30 房", minBet: 10, maxBet: 100_000 },
  { code: "R60", name: "R60 房", minBet: 10, maxBet: 200_000 },
  { code: "R90", name: "R90 房", minBet: 10, maxBet: 300_000 },
];

/* --------------------------------- 房間 --------------------------------- */

/** ✅ 路由期望名稱：getRooms */
export function getRooms() {
  return ROOMS;
}

/** ✅ 路由期望名稱：getRoomInfo */
export function getRoomInfo(code: RoomCode) {
  return ROOMS.find((r) => r.code === code) ?? null;
}

/* --------------------------------- 回合 --------------------------------- */

export async function getCurrentRound(room: RoomCode) {
  return prisma.round.findFirst({
    where: { room, endedAt: null },
    orderBy: { startedAt: "desc" },
  });
}

/** ✅ 路由期望名稱：getCurrentWithMyBets */
export async function getCurrentWithMyBets(room: RoomCode, userId?: string) {
  const round = await getCurrentRound(room);
  if (!round) return { round: null, myBets: [] as Awaited<ReturnType<typeof prisma.bet.findMany>> };

  if (!userId) return { round, myBets: [] as Awaited<ReturnType<typeof prisma.bet.findMany>> };

  const myBets = await prisma.bet.findMany({
    where: { userId, roundId: round.id },
    orderBy: { createdAt: "asc" },
  });
  return { round, myBets };
}

async function getRoundById(roundId: string) {
  return prisma.round.findUnique({ where: { id: roundId } });
}

/** ✅ 路由期望名稱：getPublicRounds（含 cursor 分頁） */
export async function getPublicRounds(params: {
  room: RoomCode;
  limit?: number;
  cursor?: string | null;
}) {
  const { room, limit = 20, cursor } = params;
  const take = Math.min(Math.max(limit, 1), 100);

  const items = await prisma.round.findMany({
    where: { room },
    orderBy: { startedAt: "desc" },
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      room: true,
      phase: true,
      outcome: true,
      startedAt: true,
      endedAt: true,
    },
  });

  let nextCursor: string | null = null;
  if (items.length > take) {
    const extra = items.pop()!;
    nextCursor = extra.id;
  }
  return { items, nextCursor };
}

/** 單局＋各注型合計（給結果明細/路子） */
export async function getRoundDetail(roundId: string) {
  const round = await prisma.round.findUnique({
    where: { id: roundId },
    include: { bets: true },
  });
  if (!round) return null;

  const totals = Object.values(BetSide).reduce<Record<BetSide, number>>((acc, side) => {
    acc[side as BetSide] = 0;
    return acc;
  }, {} as any);
  for (const b of round.bets) totals[b.side] += b.amount;

  return { round, totals };
}

/** 若沒有進行中的局就開一局（公用工具） */
export async function ensureNextRound(room: RoomCode) {
  const last = await prisma.round.findFirst({
    where: { room },
    orderBy: { startedAt: "desc" },
  });

  if (!last || last.phase === "SETTLED") {
    return prisma.round.create({
      data: { room, phase: "BETTING", startedAt: new Date() },
    });
  }
  return last;
}

export async function updateRoundPhase(roundId: string, phase: RoundPhase) {
  return prisma.round.update({ where: { id: roundId }, data: { phase } });
}

/* --------------------------------- 下注 --------------------------------- */

function validateBets(roomInfo: { minBet: number; maxBet: number }, bets: BetInput[]) {
  if (!bets.length) throw new Error("EMPTY_BETS");
  for (const b of bets) {
    if (!Number.isInteger(b.amount) || b.amount <= 0) throw new Error("BAD_AMOUNT");
    if (b.amount < roomInfo.minBet) throw new Error("BELOW_MIN");
    if (b.amount > roomInfo.maxBet) throw new Error("ABOVE_MAX");
  }
}

/** 下多注：檢狀態/餘額 → 扣錢包 → 寫 Bet → 寫 Ledger(BET_PLACED, amount<0) → 回傳最新餘額 */
export async function placeBets(
  userId: string,
  room: RoomCode,
  roundId: string,
  bets: BetInput[]
): Promise<{ wallet: number; accepted: BetInput[] }> {
  const roomInfo = getRoomInfo(room);
  if (!roomInfo) throw new Error("ROOM_NOT_FOUND");

  validateBets(roomInfo, bets);

  const round = await getRoundById(roundId);
  if (!round || round.room !== room) throw new Error("ROUND_NOT_FOUND");
  if (round.phase !== "BETTING") throw new Error("ROUND_CLOSED");

  const total = bets.reduce((s, b) => s + b.amount, 0);

  const me = await prisma.user.findUnique({ where: { id: userId }, select: { balance: true } });
  if (!me) throw new Error("USER_NOT_FOUND");
  if (me.balance < total) throw new Error("INSUFFICIENT_BALANCE");

  const wallet = await prisma.$transaction(async (tx) => {
    // 1) 扣錢包
    const updated = await tx.user.update({
      where: { id: userId },
      data: { balance: { decrement: total } },
      select: { balance: true },
    });

    // 2) 建立下注
    if (bets.length === 1) {
      const b = bets[0];
      await tx.bet.create({ data: { userId, roundId, side: b.side, amount: b.amount } });
    } else {
      await tx.bet.createMany({
        data: bets.map((b) => ({ userId, roundId, side: b.side, amount: b.amount })),
      });
    }

    // 3) Ledger：下注 = 錢包流出（負數）
    await tx.ledger.create({
      data: {
        userId,
        type: "BET_PLACED" as LedgerType,
        target: "WALLET" as BalanceTarget,
        amount: -total,
        roundId,
        room,
      },
    });

    return updated.balance;
  });

  return { wallet, accepted: bets };
}

/* ------------------------------- 我的資料 ------------------------------- */

export async function getMyRecentBets(userId: string, limit = 20) {
  return prisma.bet.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(limit, 1), 100),
    include: {
      round: {
        select: { id: true, room: true, phase: true, outcome: true, startedAt: true, endedAt: true },
      },
    },
  });
}

export async function getMyStats(userId: string) {
  const rows = await prisma.ledger.groupBy({
    by: ["type"],
    where: { userId },
    _sum: { amount: true },
  });
  const sum = (t: LedgerType) => rows.find((r) => r.type === t)?._sum.amount ?? 0;

  const betOut = sum("BET_PLACED"); // 負值
  const payout = sum("PAYOUT");
  const admin = sum("ADMIN_ADJUST");
  const reward = sum("EVENT_REWARD") + sum("TOPUP_BONUS") + sum("EXTERNAL_TOPUP");

  return { betOut, payout, admin, reward, net: payout + admin + reward + betOut };
}
