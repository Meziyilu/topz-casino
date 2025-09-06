// services/baccarat.service.ts
import { prisma } from "@/lib/prisma";
import {
  Prisma,
  RoomCode,
  RoundPhase,
  BetSide,
  LedgerType,
  BalanceTarget,
} from "@prisma/client";

/** 前端/路由傳入的下注項目型別（必填 side 與 amount） */
export type BetInput = {
  side: BetSide;
  amount: number; // 正整數，單位點數（1 = 1 元）
};

/** 房間清單（可由常數定義；若之後改做資料表，可從 DB 讀） */
const ROOMS: { code: RoomCode; name: string; minBet: number; maxBet: number }[] = [
  { code: "R30", name: "R30 房", minBet: 10, maxBet: 100000 },
  { code: "R60", name: "R60 房", minBet: 10, maxBet: 200000 },
  { code: "R90", name: "R90 房", minBet: 10, maxBet: 300000 },
];

/** 取得所有房間（供 /api/casino/baccarat/rooms） */
export function listRooms() {
  return ROOMS;
}

/** 取得單一房間（供 /api/casino/baccarat/rooms/:code） */
export function getRoom(code: RoomCode) {
  return ROOMS.find((r) => r.code === code) ?? null;
}

/** 取得房間當前局（供 /api/casino/baccarat/round/current?room=R60） */
export async function getCurrentRound(room: RoomCode) {
  const round = await prisma.round.findFirst({
    where: { room, endedAt: null },
    orderBy: { startedAt: "desc" },
  });
  return round;
}

/** 以 roundId 取局（內部用） */
async function getRoundById(roundId: string) {
  return prisma.round.findUnique({ where: { id: roundId } });
}

/** 驗證下注限制（可按需要擴充） */
function validateBets(roomInfo: { minBet: number; maxBet: number }, bets: BetInput[]) {
  if (!bets.length) throw new Error("EMPTY_BETS");
  for (const b of bets) {
    if (!Number.isInteger(b.amount) || b.amount <= 0) throw new Error("BAD_AMOUNT");
    if (b.amount < roomInfo.minBet) throw new Error("BELOW_MIN");
    if (b.amount > roomInfo.maxBet) throw new Error("ABOVE_MAX");
  }
}

/** 下注：檢查局狀態／餘額 → 扣錢包 → 寫 Bet → 寫 Ledger(BET_PLACED) → 回傳最新餘額 */
export async function placeBets(
  userId: string,
  room: RoomCode,
  roundId: string,
  bets: BetInput[]
): Promise<{ wallet: number; accepted: BetInput[] }> {
  const roomInfo = getRoom(room);
  if (!roomInfo) throw new Error("ROOM_NOT_FOUND");

  // 校驗下注格式/金額
  validateBets(roomInfo, bets);

  // 取局並檢查狀態
  const round = await getRoundById(roundId);
  if (!round || round.room !== room) throw new Error("ROUND_NOT_FOUND");
  if (round.phase !== "BETTING") throw new Error("ROUND_CLOSED");

  // 計算總額，檢查錢包
  const total = bets.reduce((sum, b) => sum + b.amount, 0);
  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { balance: true },
  });
  if (!me) throw new Error("USER_NOT_FOUND");
  if (me.balance < total) throw new Error("INSUFFICIENT_BALANCE");

  // 寫入（單一交易）
  const result = await prisma.$transaction(async (tx) => {
    // 1) 扣錢包
    const updated = await tx.user.update({
      where: { id: userId },
      data: { balance: { decrement: total } },
      select: { balance: true },
    });

    // 2) 寫多筆下注
    if (bets.length === 1) {
      const b = bets[0];
      await tx.bet.create({
        data: {
          userId,
          roundId,
          side: b.side,
          amount: b.amount,
        },
      });
    } else {
      await tx.bet.createMany({
        data: bets.map((b) => ({
          userId,
          roundId,
          side: b.side,
          amount: b.amount,
        })),
      });
    }

    // 3) 寫 Ledger（下注視為錢包流出 → 金額記負值）
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

    return { wallet: updated.balance };
  });

  return { wallet: result.wallet, accepted: bets };
}

/** 我最近的下注（供 /api/casino/baccarat/my/recent） */
export async function getMyRecentBets(userId: string, limit = 20) {
  const bets = await prisma.bet.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(limit, 1), 100),
    include: {
      round: {
        select: { id: true, room: true, phase: true, outcome: true, startedAt: true, endedAt: true },
      },
    },
  });
  return bets;
}

/** 我的統計（簡版：從 Ledger 匯總）— 淨利 = PAYOUT(+) + ADMIN_ADJUST(±) + EVENT_REWARD(+) + TOPUP_BONUS(+)
 *  − BET_PLACED(−)（Ledger.amount 下注已是負數）*/
export async function getMyStats(userId: string) {
  const ledgers = await prisma.ledger.groupBy({
    by: ["type"],
    where: { userId },
    _sum: { amount: true },
  });

  const sumBy = (type: LedgerType) =>
    ledgers.find((l) => l.type === type)?._sum.amount ?? 0;

  const betOut = sumBy("BET_PLACED"); // 通常為負值
  const payout = sumBy("PAYOUT");
  const admin = sumBy("ADMIN_ADJUST");
  const reward = sumBy("EVENT_REWARD") + sumBy("TOPUP_BONUS") + sumBy("EXTERNAL_TOPUP");

  const net = payout + admin + reward + betOut;

  return {
    betOut,
    payout,
    admin,
    reward,
    net,
  };
}

/** 最近多局（供 /api/casino/baccarat/rounds?room=R60&limit=...&cursor=...） */
export async function listRounds(params: {
  room: RoomCode;
  limit?: number;
  cursor?: string | null; // 使用 round.id 做游標
}) {
  const { room, limit = 20, cursor } = params;

  const take = Math.min(Math.max(limit, 1), 100);
  const where: Prisma.RoundWhereInput = { room };
  const orderBy: Prisma.RoundOrderByWithRelationInput = { startedAt: "desc" };

  const items = await prisma.round.findMany({
    where,
    orderBy,
    take: take + 1, // 多取一筆用來判斷是否還有下一頁
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      room: true,
      phase: true,
      outcome: true,
      startedAt: true,
      endedAt: true,
      bets: {
        select: { id: true, userId: true, side: true, amount: true, createdAt: true },
        take: 0, // 列表不帶下注，詳情頁再取
      },
    },
  });

  let nextCursor: string | null = null;
  if (items.length > take) {
    const next = items.pop()!;
    nextCursor = next.id;
  }

  return { items, nextCursor };
}

/** 取得 round 詳情（含下注統計）— 給單局頁面用 */
export async function getRoundDetail(roundId: string) {
  const round = await prisma.round.findUnique({
    where: { id: roundId },
    include: {
      bets: true,
    },
  });
  if (!round) return null;

  // 聚合各注型總額
  const totals = Object.values(BetSide).reduce<Record<BetSide, number>>((acc, side) => {
    acc[side as BetSide] = 0;
    return acc;
  }, {} as any);

  for (const b of round.bets) {
    totals[b.side] += b.amount;
  }

  return { round, totals };
}

/**（可選）產生或推進下一局：當前局進入 SETTLED 後自動開下一局 */
export async function ensureNextRound(room: RoomCode) {
  // 找最新的一局
  const last = await prisma.round.findFirst({
    where: { room },
    orderBy: { startedAt: "desc" },
  });

  if (!last || last.phase === "SETTLED") {
    // 無局或已結算 → 直接開新局
    const created = await prisma.round.create({
      data: {
        room,
        phase: "BETTING",
        startedAt: new Date(),
      },
    });
    return created;
  }

  // 若仍在 BETTING/REVEALING，直接回傳現局
  return last;
}

/**（可選）切換局狀態（管理/排程才會用；公開 API 不要呼叫） */
export async function updateRoundPhase(roundId: string, phase: RoundPhase) {
  const updated = await prisma.round.update({
    where: { id: roundId },
    data: { phase },
  });
  return updated;
}
