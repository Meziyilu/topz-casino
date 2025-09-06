// services/baccarat.service.ts
import { prisma } from "@/lib/prisma";
import { RoomCode, BetSide, RoundPhase } from "@prisma/client";
import { ReadableStream } from "stream/web";

// ======================== 型別 ========================
export type BetInput = {
  side: BetSide;
  amount: number;
};

// ======================== 房間清單 ========================
export async function getRooms() {
  // 回傳所有房間資訊（可以在這裡定義房間設定）
  return [
    { code: RoomCode.R30, name: "百家樂 R30", secondsPerRound: 30 },
    { code: RoomCode.R60, name: "百家樂 R60", secondsPerRound: 60 },
    { code: RoomCode.R90, name: "百家樂 R90", secondsPerRound: 90 },
  ];
}

// ======================== 房間資訊 ========================
export async function getRoomInfo(code: RoomCode) {
  const rooms = await getRooms();
  const room = rooms.find((r) => r.code === code);
  if (!room) throw new Error("ROOM_NOT_FOUND");
  return room;
}

// ======================== 當前局（含玩家下注） ========================
export async function getCurrentWithMyBets(userId: string, room: RoomCode) {
  const round = await prisma.round.findFirst({
    where: { room, phase: { not: "SETTLED" } },
    orderBy: { startedAt: "desc" },
  });

  if (!round) return { round: null, myBets: [] };

  const myBets = await prisma.bet.findMany({
    where: { roundId: round.id, userId },
  });

  return { round, myBets };
}

// ======================== 歷史局 ========================
export async function getPublicRounds(
  room: RoomCode,
  limit: number,
  cursor?: string
) {
  const items = await prisma.round.findMany({
    where: { room, phase: "SETTLED" },
    orderBy: { startedAt: "desc" },
    take: limit + 1,
    skip: cursor ? 1 : 0,
    ...(cursor ? { cursor: { id: cursor } } : {}),
  });

  let nextCursor: string | undefined = undefined;
  if (items.length > limit) {
    const nextItem = items.pop();
    nextCursor = nextItem?.id;
  }

  return { items, nextCursor };
}

// ======================== 玩家近期下注 ========================
export async function getMyRecentBets(userId: string) {
  return prisma.bet.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}

// ======================== 玩家統計 ========================
export async function getMyStats(userId: string) {
  const [bets, wins] = await Promise.all([
    prisma.bet.count({ where: { userId } }),
    prisma.bet.count({
      where: {
        userId,
        round: { outcome: { not: null } },
        // 簡化：假設只要押中 outcome 就算贏
      },
    }),
  ]);

  return { bets, wins };
}

// ======================== 下註 ========================
export async function placeBets(
  userId: string,
  room: RoomCode,
  roundId: string,
  bets: BetInput[]
) {
  const round = await prisma.round.findUnique({ where: { id: roundId } });
  if (!round || round.room !== room) throw new Error("ROUND_NOT_FOUND");
  if (round.phase !== "BETTING") throw new Error("ROUND_NOT_OPEN");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("USER_NOT_FOUND");

  const total = bets.reduce((s, b) => s + b.amount, 0);
  if (total > user.balance) throw new Error("INSUFFICIENT_FUNDS");

  // 寫入下注 & 扣錢
  const accepted: BetInput[] = [];
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { balance: { decrement: total } },
    });

    for (const b of bets) {
      await tx.bet.create({
        data: {
          userId,
          roundId,
          side: b.side,
          amount: b.amount,
        },
      });
      accepted.push(b);
    }

    // Ledger 記錄
    await tx.ledger.create({
      data: {
        userId,
        type: "BET_PLACED",
        target: "WALLET",
        amount: -total,
        room,
        roundId,
      },
    });
  });

  const updated = await prisma.user.findUnique({
    where: { id: userId },
    select: { balance: true },
  });

  return { wallet: updated?.balance ?? 0, accepted };
}

// ======================== 房間推播 (SSE) ========================
export async function streamRoom(room: RoomCode) {
  // 模擬推播資料，實際可接入 Redis pub/sub 或 DB 事件
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      let i = 0;
      const interval = setInterval(() => {
        const data = { room, ts: Date.now(), tick: i++ };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }, 1000);

      return () => clearInterval(interval);
    },
  });

  return { stream };
}
