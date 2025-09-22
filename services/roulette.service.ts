// services/roulette.service.ts
import {
  PrismaClient,
  Prisma,
  RouletteRoomCode,
  RouletteBetKind,
} from "@prisma/client";

const prisma = new PrismaClient();

// === 參數（可之後換成 GameConfig） ===
const BET_SEC = 30;
const REVEAL_SEC = 10;

type Phase = "BETTING" | "REVEALING" | "SETTLED";

// ====== 基礎工具 ======
function clampMs(n: number) {
  return Math.max(0, n);
}
function nowMs() {
  return Date.now();
}
function addSec(d: Date, s: number) {
  return new Date(d.getTime() + s * 1000);
}

// 歐式輪盤：紅黑表（0 = 綠）
const RED_SET = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
// 三列：0列無；第 0 列: 1,4,7,...；第 1 列: 2,5,8,...；第 2 列: 3,6,9,...
function columnIndex(n: number) {
  if (n === 0) return -1;
  return (n - 1) % 3; // 0,1,2
}
function dozenIndex(n: number) {
  if (n === 0) return -1;
  if (n <= 12) return 0;
  if (n <= 24) return 1;
  return 2;
}

// === 下注賠率（回傳「中獎倍數」= to-1 倍數；例：直注 35，紅黑/大小/單雙 1，打/列 2）===
function payoutMultiplier(kind: RouletteBetKind, payload: Prisma.JsonValue | null | undefined, result: number): number {
  const pay = (payload ?? {}) as any;
  switch (kind) {
    case "STRAIGHT":
      return (typeof pay.n === "number" && pay.n === result) ? 35 : 0;

    case "RED_BLACK":
      if (result === 0) return 0;
      if (pay?.color === "RED")   return RED_SET.has(result) ? 1 : 0;
      if (pay?.color === "BLACK") return !RED_SET.has(result) ? 1 : 0;
      return 0;

    case "ODD_EVEN":
      if (result === 0) return 0;
      if (pay?.odd === true)  return (result % 2 === 1) ? 1 : 0;
      if (pay?.odd === false) return (result % 2 === 0) ? 1 : 0;
      return 0;

    case "LOW_HIGH":
      if (result === 0) return 0;
      if (pay?.high === true)  return (result >= 19 && result <= 36) ? 1 : 0;
      if (pay?.high === false) return (result >= 1  && result <= 18) ? 1 : 0;
      return 0;

    case "DOZEN": {
      const d = dozenIndex(result); // 0,1,2
      return (typeof pay?.dozen === "number" && pay.dozen === d) ? 2 : 0;
    }

    case "COLUMN": {
      const c = columnIndex(result); // 0,1,2
      return (typeof pay?.col === "number" && pay.col === c) ? 2 : 0;
    }

    default:
      return 0; // 其他複合注型暫不開放
  }
}

// === RNG：0~36 ===
function rngWheel(): number {
  return Math.floor(Math.random() * 37);
}

// === 取得（或建立）最新一局 ===
async function ensureLatestRound(room: RouletteRoomCode) {
  let round = await prisma.rouletteRound.findFirst({
    where: { room },
    orderBy: { startedAt: "desc" },
  });
  if (!round) {
    round = await prisma.rouletteRound.create({
      data: {
        room,
        phase: "BETTING" as any,
        startedAt: new Date(),
        result: null,
      },
    });
  }
  return round;
}

// === 房間推進（由 loop 呼叫） ===
async function driveRoom(room: RouletteRoomCode) {
  const round = await ensureLatestRound(room);
  const now = new Date();

  if (round.phase === "BETTING") {
    const lockAt = addSec(round.startedAt, BET_SEC);
    if (now >= lockAt) {
      await prisma.rouletteRound.update({
        where: { id: round.id },
        data: { phase: "REVEALING" as any },
      });
    }
    return;
  }

  if (round.phase === "REVEALING") {
    // 沒結果先寫結果
    if (round.result == null) {
      await prisma.rouletteRound.update({
        where: { id: round.id },
        data: { result: rngWheel() },
      });
      return;
    }
    // 揭示結束 → 結算 → 標記 SETTLED → 開下一局
    const settleAt = addSec(round.startedAt, BET_SEC + REVEAL_SEC);
    if (now >= settleAt) {
      await settleRound(round.id);
      await prisma.rouletteRound.update({
        where: { id: round.id },
        data: { phase: "SETTLED" as any, endedAt: now },
      });
      await prisma.rouletteRound.create({
        data: {
          room,
          phase: "BETTING" as any,
          startedAt: now,
          result: null,
        },
      });
    }
    return;
  }

  if (round.phase === "SETTLED") {
    // 保險：如果沒新局就開一局
    const next = await prisma.rouletteRound.findFirst({
      where: { room, startedAt: { gt: round.startedAt } },
      orderBy: { startedAt: "desc" },
    });
    if (!next) {
      await prisma.rouletteRound.create({
        data: {
          room,
          phase: "BETTING" as any,
          startedAt: now,
          result: null,
        },
      });
    }
    return;
  }
}

// === 導出：啟動/停止房間 loop（以 app 記憶體為單例，適用單一實例部署） ===
const roomLoops = new Map<RouletteRoomCode, NodeJS.Timeout>();

export async function startRoomLoop(room: RouletteRoomCode) {
  if (roomLoops.has(room)) {
    return { started: false, reason: "ALREADY_RUNNING" };
  }
  // 先保證有當前局
  await ensureLatestRound(room);

  const tick = async () => {
    try {
      await driveRoom(room);
    } catch (e) {
      // TODO: logger
    } finally {
      const t = setTimeout(tick, 1000);
      roomLoops.set(room, t);
    }
  };
  const t = setTimeout(tick, 1000);
  roomLoops.set(room, t);
  return { started: true };
}

export function stopRoomLoop(room: RouletteRoomCode) {
  const t = roomLoops.get(room);
  if (t) {
    clearTimeout(t);
    roomLoops.delete(room);
    return { stopped: true };
  }
  return { stopped: false, reason: "NOT_RUNNING" };
}

// === 導出：即時狀態（/state route 用） ===
export async function getState(room: RouletteRoomCode) {
  const round = await ensureLatestRound(room);
  const now = nowMs();
  let msLeft = 0;

  if (round.phase === "BETTING") {
    msLeft = addSec(round.startedAt, BET_SEC).getTime() - now;
  } else if (round.phase === "REVEALING") {
    msLeft = addSec(round.startedAt, BET_SEC + REVEAL_SEC).getTime() - now;
  } else {
    msLeft = 0;
  }

  return {
    room,
    phase: round.phase as Phase,
    msLeft: clampMs(msLeft),
    round: {
      id: round.id,
      phase: round.phase as Phase,
      startedAt: round.startedAt.toISOString(),
      result: round.result,
    },
    timers: { betSec: BET_SEC, revealSec: REVEAL_SEC },
  };
}

// === 導出：大廳概覽（/overview route 用） ===
export async function getOverview(room: RouletteRoomCode, userId?: string) {
  const round = await ensureLatestRound(room);

  const [aggs, my] = await Promise.all([
    prisma.rouletteBet.aggregate({
      _sum: { amount: true },
      _count: true,
      where: { roundId: round.id },
    }),
    userId
      ? prisma.rouletteBet.aggregate({
          _sum: { amount: true },
          where: { roundId: round.id, userId },
        })
      : Promise.resolve({ _sum: { amount: 0 } } as any),
  ]);

  const uniqueUsers = await prisma.rouletteBet.groupBy({
    by: ["userId"],
    where: { roundId: round.id },
  });

  // 同步剩餘時間（和 /state 一致）
  const state = await getState(room);

  return {
    room,
    roundId: round.id,
    totalAmount: aggs._sum.amount ?? 0,
    totalBets: aggs._count,
    uniqueUsers: uniqueUsers.length,
    myTotal: my?._sum?.amount ?? 0,
    msLeft: state.msLeft,
    online: uniqueUsers.length, // 你大廳卡的 online 就直接用這數
  };
}

// === 導出：下注（/bet route 用） ===
export async function placeBet(args: {
  userId: string;
  room: RouletteRoomCode;
  kind: RouletteBetKind;
  amount: number;
  payload?: Prisma.JsonValue;
}) {
  if (args.amount <= 0) throw new Error("BAD_AMOUNT");

  const round = await ensureLatestRound(args.room);
  if (round.phase !== "BETTING") throw new Error("NOT_BETTING");

  // 這裡可加餘額檢查；簡化先略
  const bet = await prisma.rouletteBet.create({
    data: {
      userId: args.userId,
      roundId: round.id,
      kind: args.kind,
      amount: args.amount,
      payload: args.payload ?? Prisma.JsonNull,
    },
  });

  return { ok: true, betId: bet.id, roundId: round.id };
}

// === 導出：結算（admin 手動或 loop 自動呼叫） ===
// 備註：這裡的發放只計「中獎倍數 * 金額」= 純獲利；若你要把本金一起返還，請把倍數改為包含本金（例如 偶數注改 2、直注改 36）
export async function settleRound(roundId: string) {
  const round = await prisma.rouletteRound.findUnique({ where: { id: roundId } });
  if (!round) throw new Error("ROUND_NOT_FOUND");
  if (round.result == null) throw new Error("NO_RESULT");

  const bets = await prisma.rouletteBet.findMany({ where: { roundId } });

  await prisma.$transaction(async (tx) => {
    for (const b of bets) {
      const multi = payoutMultiplier(b.kind, b.payload as any, round.result!);
      if (multi > 0) {
        const win = Math.floor(b.amount * multi);
        // 發錢：加到 User.balance；同時寫一筆 Ledger
        await tx.user.update({
          where: { id: b.userId },
          data: { balance: { increment: win } },
        });
        await tx.ledger.create({
          data: {
            userId: b.userId,
            type: "PAYOUT",
            target: "WALLET",
            amount: win,
            meta: {
              game: "ROULETTE",
              roundId,
              kind: b.kind,
              payload: b.payload,
              result: round.result,
            } as any,
          },
        });
      }
    }
  });

  return { ok: true };
}
