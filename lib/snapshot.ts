// lib/snapshot.ts
// 用途：排行榜讀取（封裝查詢/排序/輸出格式）；會視需要觸發 lazy rebuild
import prisma from "@/lib/prisma";
import { rebuildSnapshot } from "./stats";

export type StatPeriod = "DAILY" | "WEEKLY";
export type RoomCode = "R30" | "R60" | "R90";
export type LeaderboardRow = {
  userId: string;
  userName: string;
  avatarUrl: string | null;
  publicSlug: string | null;
  room: RoomCode | null;
  period: StatPeriod;
  bet: bigint;
  payout: bigint;
  bonus: bigint;
  betsCount: number;
  wins: number;
  losses: number;
  netProfit: bigint;
  netWithBonus: bigint;
};

export type LeaderboardQuery = {
  period: StatPeriod;
  room?: RoomCode | "ALL";
  withBonus?: boolean;
  limit?: number; // 預設 50
};

export async function getLeaderboard(q: LeaderboardQuery) {
  const period = q.period;
  const room: RoomCode | undefined =
    !q.room || q.room === "ALL" ? undefined : q.room;
  const limit = Math.min(q.limit ?? 50, 200);
  const withBonus = !!q.withBonus;

  // 確保快照存在（lazy rebuild）
  await rebuildSnapshot(period, room);

  // 以當前窗口查
  const { windowStart, windowEnd } = await getCurrentWindow(period);

  const rows = await prisma.userStatSnapshot.findMany({
    where: {
      period,
      windowStart,
      windowEnd,
      room: room ?? null,
    },
    orderBy: withBonus ? undefined : { netProfit: "desc" },
    take: withBonus ? 500 : limit, // withBonus 需要在程式端排序
    include: {
      user: { select: { id: true, name: true, avatarUrl: true, publicSlug: true } },
    },
  });

  let mapped: LeaderboardRow[] = rows.map((s) => {
    const netWithBonus = (s.gamePayout + s.bonusIncome) - s.gameBet;
    return {
      userId: s.userId,
      userName: s.user?.name ?? "",
      avatarUrl: s.user?.avatarUrl ?? null,
      publicSlug: s.user?.publicSlug ?? null,
      room: s.room,
      period: s.period as StatPeriod,
      bet: s.gameBet,
      payout: s.gamePayout,
      bonus: s.bonusIncome,
      betsCount: s.betsCount,
      wins: s.winsCount,
      losses: s.lossesCount,
      netProfit: s.netProfit,
      netWithBonus,
    };
  });

  if (withBonus) {
    mapped = mapped
      .sort((a, b) => (a.netWithBonus === b.netWithBonus ? 0 : a.netWithBonus < b.netWithBonus ? 1 : -1))
      .slice(0, limit);
  }

  return {
    period,
    room: room ?? null,
    windowStart,
    windowEnd,
    withBonus,
    items: mapped,
  };
}

export async function getCurrentWindow(period: StatPeriod) {
  // 與 lib/time-window.ts 相同邏輯，但避免循環匯入
  const now = new Date();
  const atUtc = (d: Date) =>
    new Date(
      Date.UTC(
        d.getUTCFullYear(),
        d.getUTCMonth(),
        d.getUTCDate(),
        0,
        0,
        0,
        0
      )
    );

  const utc = atUtc(now);
  if (period === "DAILY") {
    const start = utc;
    const end = new Date(Date.UTC(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate() + 1));
    return { windowStart: start, windowEnd: end };
  } else {
    // WEEKLY：週一 00:00:00 UTC
    const day = (now.getUTCDay() || 7) - 1; // 0..6 (週一=0)
    const monday = new Date(
      Date.UTC(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate() - day)
    );
    const nextMonday = new Date(
      Date.UTC(
        monday.getUTCFullYear(),
        monday.getUTCMonth(),
        monday.getUTCDate() + 7
      )
    );
    return { windowStart: monday, windowEnd: nextMonday };
  }
}
