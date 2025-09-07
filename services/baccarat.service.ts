// services/baccarat.service.ts
import { prisma } from "@/lib/prisma";
import {
  RoomCode,
  RoundPhase,
  BetSide,
  LedgerType,
  BalanceTarget,
} from "@prisma/client";

/** 請在 app/api 以外使用：用於 API 路由的核心邏輯 */
export type PublicRoom = { code: RoomCode; name: string; minBet: number; maxBet: number; secondsPerRound: number };
export type PublicRound = {
  id: string;
  room: RoomCode;
  phase: RoundPhase;
  startedAt: string;
  endsAt?: string | null;
  outcome?: string | null;
  // 近十局（只給顏色/簡要）
  recent?: { id: string; outcome: string | null }[];
  // 自己本局下注匯總（前端顯示）
  myBets?: { side: BetSide; amount: number }[];
};

export type BetInput = { side: BetSide; amount: number };

const ROOM_CONFIG: Record<RoomCode, PublicRoom> = {
  R30: { code: "R30", name: "R30 房", minBet: 10, maxBet: 10000, secondsPerRound: 30 },
  R60: { code: "R60", name: "R60 房", minBet: 10, maxBet: 10000, secondsPerRound: 60 },
  R90: { code: "R90", name: "R90 房", minBet: 10, maxBet: 10000, secondsPerRound: 90 },
};

function now() { return new Date(); }
function sec(n: number) { return n * 1000; }

/** 取所有公開房間（靜態配置） */
export async function getRooms(): Promise<PublicRoom[]> {
  return [ROOM_CONFIG.R30, ROOM_CONFIG.R60, ROOM_CONFIG.R90];
}

/** 取單一房間資訊（靜態配置） */
export async function getRoomInfo(code: RoomCode): Promise<PublicRoom> {
  const rc = ROOM_CONFIG[code];
  if (!rc) throw new Error("ROOM_NOT_FOUND");
  return rc;
}

/** 近十局（公開） */
export async function getPublicRounds(room: RoomCode, limit = 10, cursor?: string | null) {
  const where = { room } as const;
  const items = await prisma.round.findMany({
    where,
    orderBy: { startedAt: "desc" },
    take: limit,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    select: { id: true, outcome: true, startedAt: true, phase: true },
  });
  const nextCursor = items.length === limit ? items[items.length - 1].id : null;
  return { items, nextCursor };
}

/** 取該房最新一局；若最新局已結算則不自動開新局（由系統或之後管理工具開） */
export async function getCurrentRound(room: RoomCode) {
  return prisma.round.findFirst({
    where: { room },
    orderBy: { startedAt: "desc" },
  });
}

/** 取該房最新一局 + 我在這局的下注彙總 & 近十局 */
export async function getCurrentWithMyBets(room: RoomCode, userId: string | null): Promise<PublicRound | null> {
  const cur = await getCurrentRound(room);
  if (!cur) return null;

  // 我的本局下注
  let my: { side: BetSide; amount: number }[] | undefined = undefined;
  if (userId) {
    const rows = await prisma.bet.groupBy({
      by: ["side"],
      where: { roundId: cur.id, userId },
      _sum: { amount: true },
    });
    my = rows.map(r => ({ side: r.side, amount: r._sum.amount ?? 0 }));
  }

  // 近十局
  const last10 = await prisma.round.findMany({
    where: { room },
    orderBy: { startedAt: "desc" },
    take: 10,
    select: { id: true, outcome: true },
  });

  const rc = ROOM_CONFIG[room];
  const endsAt =
    cur.phase === "BETTING"
      ? new Date(cur.startedAt.getTime() + sec(rc.secondsPerRound)).toISOString()
      : null;

  return {
    id: cur.id,
    room: cur.room,
    phase: cur.phase,
    startedAt: cur.startedAt.toISOString(),
    endsAt,
    outcome: cur.outcome ?? null,
    myBets: my,
    recent: last10.map(i => ({ id: i.id, outcome: i.outcome ?? null })),
  };
}

/** 下單下注（只允許 BETTING 期；扣款＝WALLET；寫 Bet + Ledger(BET_PLACED) ） */
export async function placeBets(
  userId: string,
  room: RoomCode,
  roundId: string,
  bets: BetInput[],
) {
  if (!bets?.length) throw new Error("NO_BETS");

  const rc = ROOM_CONFIG[room];
  if (!rc) throw new Error("ROOM_NOT_FOUND");

  const r = await prisma.round.findUnique({ where: { id: roundId } });
  if (!r || r.room !== room) throw new Error("ROUND_NOT_FOUND");
  if (r.phase !== "BETTING") throw new Error("ROUND_NOT_BETTING");

  // 檢查下注金額
  let total = 0;
  for (const b of bets) {
    if (!b || typeof b.amount !== "number" || b.amount <= 0) throw new Error("BAD_AMOUNT");
    if (b.amount < rc.minBet || b.amount > rc.maxBet) throw new Error("BET_OUT_OF_RANGE");
    total += b.amount;
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { balance: true } });
  if (!user) throw new Error("USER_NOT_FOUND");
  if (user.balance < total) throw new Error("INSUFFICIENT_WALLET");

  // 交易：扣款（wallet）+ 新增 Bet 多筆 + Ledger: BET_PLACED
  const tx = await prisma.$transaction(async (tx) => {
    const upd = await tx.user.update({
      where: { id: userId },
      data: { balance: { decrement: total } },
      select: { balance: true },
    });

    await tx.bet.createMany({
      data: bets.map(b => ({
        userId,
        roundId,
        side: b.side,
        amount: b.amount,
      })),
    });

    await tx.ledger.create({
      data: {
        userId,
        type: "BET_PLACED",
        target: "WALLET",
        amount: -total,
      },
    });

    return { wallet: upd.balance };
  });

  return { wallet: tx.wallet, accepted: bets.length };
}

/** 小工具：派彩（之後管理/系統呼叫；這裡先保留邏輯） */
export async function settleRound(roundId: string, outcome: "PLAYER" | "BANKER" | "TIE", payoutMap: Record<BetSide, number>) {
  // 1) 將回合標記 REVEALING → SETTLED（你也可先寫 REVEALING 再結算）
  const round = await prisma.round.findUnique({ where: { id: roundId } });
  if (!round) throw new Error("ROUND_NOT_FOUND");

  // 2) 找出所有下注，計算派彩（示意：payout = amount * odds）
  const bets = await prisma.bet.findMany({ where: { roundId } });

  // 3) 聚合：每人贏得金額
  const userPayout: Record<string, number> = {};
  for (const b of bets) {
    const odds = payoutMap[b.side] ?? 0;
    const prize = Math.floor(b.amount * odds); // 可調整抽水
    if (prize > 0) {
      userPayout[b.userId] = (userPayout[b.userId] ?? 0) + prize;
    }
  }

  await prisma.$transaction(async (tx) => {
    // round → outcome / phase
    await tx.round.update({
      where: { id: roundId },
      data: { outcome, phase: "SETTLED" },
    });

    // 派彩
    for (const [uid, inc] of Object.entries(userPayout)) {
      await tx.user.update({
        where: { id: uid },
        data: { balance: { increment: inc } },
      });
      await tx.ledger.create({
        data: {
          userId: uid,
          type: "PAYOUT",
          target: "WALLET",
          amount: inc,
        },
      });
    }
  });
}
