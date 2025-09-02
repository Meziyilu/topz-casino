// lib/stats.ts
import prisma from "@/lib/prisma";
import { currentWindow } from "./time-window";

// period: "DAILY" | "WEEKLY"
// room: "R30" | "R60" | "R90" | undefined  (undefined 代表全站榜)
export async function rebuildSnapshot(period: "DAILY"|"WEEKLY", room?: "R30"|"R60"|"R90") {
  const { windowStart, windowEnd } = currentWindow(period);

  // 只統計當期窗口的 Ledger
  // - 遊戲下注：BET_PLACED
  // - 遊戲派彩：PAYOUT
  // - 獎勵：CHECKIN_BONUS / EVENT_REWARD / TOPUP_BONUS
  // 依房間過濾（room 為 null 表示全站：不加 room 條件）
  const whereBase: any = { createdAt: { gte: windowStart, lt: windowEnd } };
  if (room) whereBase.room = room;

  // 聚合下注與派彩
  const placed = await prisma.ledger.groupBy({
    by: ["userId"],
    where: { ...whereBase, type: "BET_PLACED" },
    _sum: { amount: true },
    _count: { id: true },
  });

  const payout = await prisma.ledger.groupBy({
    by: ["userId"],
    where: { ...whereBase, type: "PAYOUT" },
    _sum: { amount: true },
    _count: { id: true },
  });

  const bonus = await prisma.ledger.groupBy({
    by: ["userId"],
    where: { 
      ...whereBase, 
      type: { in: ["CHECKIN_BONUS", "EVENT_REWARD", "TOPUP_BONUS"] }
    },
    _sum: { amount: true },
  });

  // 轉為 map 便於合併
  const mPlaced = new Map(placed.map(x => [x.userId, x]));
  const mPayout = new Map(payout.map(x => [x.userId, x]));
  const mBonus  = new Map(bonus.map(x => [x.userId, x]));

  // 以所有出現過 userId 為集合
  const userIds = new Set<string>([
    ...placed.map(x => x.userId),
    ...payout.map(x => x.userId),
    ...bonus.map(x => x.userId),
  ]);

  const tasks: any[] = [];
  for (const userId of userIds) {
    const p = mPlaced.get(userId);
    const q = mPayout.get(userId);
    const b = mBonus.get(userId);

    const gameBet     = BigInt(p?._sum.amount ?? 0);
    const gamePayout  = BigInt(q?._sum.amount ?? 0);
    const bonusIncome = BigInt(b?._sum.amount ?? 0);

    const betsCount   = p?._count.id ?? 0;
    const winsCount   = Math.max(0, (q?._count.id ?? 0)); // 簡化：派彩筆數當作贏次數（可依你遊戲規則改）
    const lossesCount = Math.max(0, betsCount - winsCount);

    const netProfit = gamePayout - gameBet;

    tasks.push(
      prisma.userStatSnapshot.upsert({
        where: {
          userId_period_windowStart_windowEnd_room: {
            userId, period, windowStart, windowEnd, room: room ?? null
          }
        },
        update: {
          gameBet, gamePayout, bonusIncome, betsCount, winsCount, lossesCount, netProfit
        },
        create: {
          userId, period, windowStart, windowEnd, room: room ?? null,
          gameBet, gamePayout, bonusIncome, betsCount, winsCount, lossesCount, netProfit
        }
      })
    );
  }

  if (tasks.length) await prisma.$transaction(tasks);
  return { windowStart, windowEnd, affectedUsers: tasks.length };
}
