// services/baccarat.service.ts
import { prisma } from "@/lib/prisma";
import {
  BalanceTarget,
  BetSide,
  LedgerType,
  RoomCode,
  RoundPhase,
  type Prisma,
} from "@prisma/client";
import { taipeiStartOfTodayUTC } from "@/lib/time";

// ---- 參數 ----
const ROUND_SECONDS = 30;
const REVEAL_SECONDS = 6;

function computeCountdown(phase: RoundPhase, startedAt: Date): number {
  const now = Date.now();
  const t0 = startedAt.getTime();
  if (phase === "BETTING") return Math.max(0, Math.ceil((t0 + ROUND_SECONDS * 1000 - now) / 1000));
  if (phase === "REVEALING") return Math.max(0, Math.ceil((t0 + REVEAL_SECONDS * 1000 - now) / 1000));
  return 0;
}

export async function getRooms() {
  const rooms: RoomCode[] = ["R30", "R60", "R90"];
  const latest = await prisma.round.findMany({
    where: { room: { in: rooms } },
    orderBy: { startedAt: "desc" },
    take: rooms.length * 3,
  });
  return rooms.map((code) => {
    const r = latest.find((x) => x.room === code);
    if (!r) {
      return { code, phase: "BETTING" as RoundPhase, roundId: null, countdown: ROUND_SECONDS, online: 0 };
    }
    return {
      code,
      phase: r.phase,
      roundId: r.id,
      countdown: computeCountdown(r.phase, r.startedAt),
      online: 0,
    };
  });
}

export async function getRoomInfo(code: RoomCode) {
  const current = await prisma.round.findFirst({ where: { room: code }, orderBy: { startedAt: "desc" } });

  const recent = await prisma.round.findMany({
    where: { room: code, outcome: { not: null } },
    orderBy: { startedAt: "desc" },
    take: 10,
    select: { outcome: true },
  });

  // 當局下注池（by side）
  let pool: Partial<Record<BetSide, number>> = {};
  if (current?.id) {
    const grouped = await prisma.bet.groupBy({
      by: ["side"],
      where: { roundId: current.id },
      _sum: { amount: true },
    });
    grouped.forEach((g) => (pool[g.side as BetSide] = g._sum.amount ?? 0));
  }

  return {
    code,
    phase: (current?.phase ?? "BETTING") as RoundPhase,
    roundId: current?.id ?? null,
    countdown: current ? computeCountdown(current.phase, current.startedAt) : ROUND_SECONDS,
    recentOutcomes: recent.map((r) => r.outcome),
    pool,
  };
}

export async function getCurrentWithMyBets(userId: string, room: RoomCode) {
  const round = await prisma.round.findFirst({ where: { room }, orderBy: { startedAt: "desc" } });

  const myBets = round
    ? await prisma.bet.findMany({
        where: { roundId: round.id, userId },
        select: { side: true, amount: true },
      })
    : [];

  const pool = round
    ? await prisma.bet.groupBy({
        by: ["side"],
        where: { roundId: round.id },
        _sum: { amount: true },
      })
    : [];

  const poolObj: Partial<Record<BetSide, number>> = {};
  pool.forEach((g) => (poolObj[g.side as BetSide] = g._sum.amount ?? 0));

  const wallet = await prisma.user.findUnique({ where: { id: userId }, select: { balance: true } });

  return {
    round: round
      ? {
          id: round.id,
          room: round.room,
          phase: round.phase,
          countdown: computeCountdown(round.phase, round.startedAt),
        }
      : null,
    myBets: myBets.map((b) => ({ side: b.side, amount: b.amount })),
    myTotal: myBets.reduce((s, x) => s + x.amount, 0),
    pool: poolObj,
    wallet: wallet?.balance ?? 0,
  };
}

type BetInput = { side: BetSide; amount: number };
export async function placeBets(userId: string, room: RoomCode, roundId: string, bets: BetInput[]) {
  if (!bets.length) throw new Error("EMPTY_BETS");

  const round = await prisma.round.findUnique({ where: { id: roundId } });
  if (!round || round.room !== room) throw new Error("ROUND_NOT_FOUND");
  if (round.phase !== "BETTING") throw new Error("NOT_BETTING");

  const total = bets.reduce((s, b) => s + Math.max(0, Math.floor(b.amount)), 0);
  if (total <= 0) throw new Error("BAD_AMOUNT");

  const result = await prisma.$transaction(async (tx) => {
    const u = await tx.user.findUnique({ where: { id: userId }, select: { balance: true } });
    if (!u || u.balance < total) throw new Error("NO_FUNDS");

    await tx.user.update({ where: { id: userId }, data: { balance: { decrement: total } } });

    await tx.bet.createMany({
      data: bets.map((b) => ({
        userId,
        roundId,
        side: b.side,
        amount: Math.floor(b.amount),
      })),
    });

    await tx.ledger.create({
      data: { userId, type: "BET_PLACED", target: "WALLET", amount: total },
    });

    const nu = await tx.user.findUnique({ where: { id: userId }, select: { balance: true } });
    return { wallet: nu?.balance ?? 0 };
  });

  return { wallet: result.wallet, accepted: bets };
}

export async function getMyRecentBets(userId: string, limit = 20) {
  const bets = await prisma.bet.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      roundId: true,
      side: true,
      amount: true,
      createdAt: true,
      round: { select: { room: true, outcome: true } },
    },
  });

  return bets.map((b) => ({
    roundId: b.roundId,
    room: b.round.room,
    side: b.side,
    amount: b.amount,
    outcome: b.round.outcome,
    createdAt: b.createdAt,
  }));
}

export async function getMyStats(userId: string) {
  const todayUTC = taipeiStartOfTodayUTC();

  const [todayBets, todayPayout, allPayout] = await Promise.all([
    prisma.bet.aggregate({ _sum: { amount: true }, _count: { _all: true }, where: { userId, createdAt: { gte: todayUTC } } }),
    prisma.ledger.aggregate({ _sum: { amount: true }, where: { userId, type: "PAYOUT", target: "WALLET", createdAt: { gte: todayUTC } } }),
    prisma.ledger.aggregate({ _sum: { amount: true }, where: { userId, type: "PAYOUT", target: "WALLET" } }),
  ]);

  const allStake = await prisma.bet.aggregate({ _sum: { amount: true }, where: { userId } });

  return {
    today: {
      bets: todayBets._count._all ?? 0,
      stake: todayBets._sum.amount ?? 0,
      payout: todayPayout._sum.amount ?? 0,
      net: (todayPayout._sum.amount ?? 0) - (todayBets._sum.amount ?? 0),
    },
    alltime: {
      bets: await prisma.bet.count({ where: { userId } }),
      stake: allStake._sum.amount ?? 0,
      payout: allPayout._sum.amount ?? 0,
      net: (allPayout._sum.amount ?? 0) - (allStake._sum.amount ?? 0),
    },
  };
}

export async function getPublicRounds(room: RoomCode, limit = 30, cursor?: string) {
  const where: Prisma.RoundWhereInput = { room, outcome: { not: null } };
  const items = await prisma.round.findMany({
    where,
    orderBy: { startedAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: { id: true, room: true, outcome: true, endedAt: true, startedAt: true },
  });

  let nextCursor: string | null = null;
  if (items.length > limit) {
    nextCursor = items[limit].id;
    items.pop();
  }
  return { items, nextCursor };
}
