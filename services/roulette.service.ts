// services/roulette.service.ts
import { prisma } from "@/lib/prisma";
import {
  RouletteRoomCode,
  SicBoPhase,
  RouletteBetKind,
  GameCode,
  LedgerType,
  BalanceTarget,
} from "@prisma/client";
import { withAdvisoryLock } from "@/lib/locks";
import {
  computePhase, toDbPhase, fromDbPhase,
  BETTING_MS, REVEAL_MS, CYCLE_MS, now
} from "@/lib/roulette/timers";
import { nextResult } from "@/lib/roulette/rng"; // 你現有的亂數
import { isValidKind, payoutMultiplier } from "@/lib/roulette/payout"; // 你現有的賠率表

// --- In-memory loop registry ---
type RoomKey = `${RouletteRoomCode}`;
declare global {
  // 避免 Next dev/hot reload 重複宣告
  // eslint-disable-next-line no-var
  var __ROULETTE_LOOPS__: Map<RoomKey, ReturnType<typeof setTimeout>>;
}
const loops: Map<RoomKey, ReturnType<typeof setTimeout>> =
  global.__ROULETTE_LOOPS__ ?? (global.__ROULETTE_LOOPS__ = new Map());

function loopKey(room: RouletteRoomCode): RoomKey {
  return `${room}`;
}

// 每個房間的鎖 key（Postgres advisory lock 需要 int；用 hash 也行，這裡簡化）
function lockKey(room: RouletteRoomCode) {
  // 固定 base + enum index
  const base = 424242;
  const idx = Object.values(RouletteRoomCode).indexOf(room);
  return base * 100 + idx;
}

// 啟動/確認 loop（被頁面/API 叫用）
export async function ensureRoomLoop(room: RouletteRoomCode) {
  const key = loopKey(room);
  if (loops.has(key)) return;

  // 確保至少有一筆 round 的 t0（startsAt）可供 computePhase
  await ensureBootstrapRound(room);

  const tick = async () => {
    try {
      await safeTick(room);
    } catch {
      // 忽略單次錯誤，避免 loop 中斷
    } finally {
      // 依最近下一個轉場點安排下一次 tick，減少 CPU 空轉
      const nextIn = await nextWakeDelay(room);
      const h = setTimeout(tick, nextIn);
      loops.set(key, h);
    }
  };

  // 立刻跑一次，之後排程
  await tick();
}

// 根據 DB/phase 算下一次喚醒時間
async function nextWakeDelay(room: RouletteRoomCode) {
  const round = await getCurrentRound(room);
  if (!round) return 1000;

  const { phase, msLeft } = computePhase(round.startedAt);
  if (phase === "BETTING") return Math.min(msLeft, 2000);
  if (phase === "REVEALING") return Math.min(msLeft, 1000);
  return 1000;
}

// 第一次使用時建立一個 startsAt 錨點
async function ensureBootstrapRound(room: RouletteRoomCode) {
  const latest = await prisma.rouletteRound.findFirst({
    where: { room },
    orderBy: { startedAt: "desc" },
  });
  if (latest) return;

  const t0 = new Date(Math.floor(Date.now() / CYCLE_MS) * CYCLE_MS); // 對齊分鐘：40s 週期
  await prisma.rouletteRound.create({
    data: {
      room,
      phase: "BETTING",
      startedAt: t0,
    } as any,
  });
}

async function getCurrentRound(room: RouletteRoomCode) {
  // 「目前週期」的那筆：用 startedAt 對齊 t0 + floor
  // 也可直接找最新一筆
  return prisma.rouletteRound.findFirst({
    where: { room },
    orderBy: { startedAt: "desc" },
  });
}

// 單步驟 tick：計算 phase → 補結果 → 結算 → 開新局
async function safeTick(room: RouletteRoomCode) {
  const lock = lockKey(room);
  await withAdvisoryLock(lock, async () => {
    const round = await getCurrentRound(room);
    if (!round) return;

    const tm = computePhase(round.startedAt);
    const dbPhase = fromDbPhase(round.phase as SicBoPhase);

    // 進入 REVEALING：若沒結果 → 產出結果（不派彩）
    if (tm.phase === "REVEALING" && (round.result == null || dbPhase !== "REVEALING")) {
      const res = nextResult().result; // 0..36 的數字
      await prisma.rouletteRound.update({
        where: { id: round.id },
        data: {
          result: res,
          phase: toDbPhase("REVEALING"),
          endedAt: null,
        },
      });
      return;
    }

    // REVEALING → SETTLED：派彩一次
    if (tm.phase === "SETTLED" && dbPhase !== "SETTLED") {
      await settleRound(round.id); // 只傳 roundId（你之前 API 抱怨多帶參數）
      return;
    }

    // 完整一輪 → 開新局（以 t0 + n*CYCLE_MS 對齊下一輪）
    if (tm.phase === "BETTING") {
      // 確保最新 round 的 startedAt 是當前輪的錨點
      const expectT0 = new Date(Math.floor(Date.now() / CYCLE_MS) * CYCLE_MS);
      // 若現有 startedAt 與 expectT0 相差 > 1s，就開一筆新局
      if (Math.abs(round.startedAt.getTime() - expectT0.getTime()) > 1000) {
        await prisma.rouletteRound.create({
          data: {
            room,
            phase: toDbPhase("BETTING"),
            startedAt: expectT0,
            endedAt: null,
            result: null,
          },
        });
      }
    }
  });
}

// --- 對外服務（API 會 import）---

export async function getState(room: RouletteRoomCode) {
  const round = await getCurrentRound(room);
  if (!round) return { ok: true, room, phase: "BETTING", msLeft: BETTING_MS };

  const tm = computePhase(round.startedAt);
  return {
    ok: true,
    room,
    roundId: round.id,
    phase: tm.phase,
    msLeft: tm.msLeft,
    startedAt: round.startedAt,
    result: round.result,
  };
}

export async function getOverview(room: RouletteRoomCode) {
  // 簡版：近 20 局走勢 + 略統計
  const last20 = await prisma.rouletteRound.findMany({
    where: { room, result: { not: null } },
    orderBy: { startedAt: "desc" },
    take: 20,
  });
  return {
    ok: true,
    history: last20.map(r => ({
      at: r.startedAt,
      result: r.result,
    })).reverse(),
  };
}

export async function placeBet(args: {
  userId: string;
  room: RouletteRoomCode;
  kind: RouletteBetKind;
  amount: number;
  payload?: any;
}) {
  // 確保 loop
  await ensureRoomLoop(args.room);

  // phase 檢查
  const round = await getCurrentRound(args.room);
  if (!round) throw new Error("ROUND_NOT_READY");
  const { phase } = computePhase(round.startedAt);
  if (phase !== "BETTING") throw new Error("NOT_BETTING");

  // 注型檢查
  if (!isValidKind(args.kind)) throw new Error("INVALID_KIND");
  if (args.amount <= 0) throw new Error("INVALID_AMOUNT");

  // 餘額檢查/扣款（用 Ledger）
  await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: args.userId } });
    if (!user) throw new Error("USER_NOT_FOUND");
    if (user.balance < args.amount) throw new Error("INSUFFICIENT");

    await tx.user.update({
      where: { id: args.userId },
      data: { balance: { decrement: args.amount } },
    });
    await tx.ledger.create({
      data: {
        userId: args.userId,
        type: LedgerType.BET_PLACED,
        target: BalanceTarget.WALLET,
        amount: -args.amount,
        meta: {
          game: "ROULETTE",
          room: args.room,
          kind: args.kind,
        },
      },
    });

    await tx.rouletteBet.create({
      data: {
        userId: args.userId,
        roundId: round.id,
        kind: args.kind,
        amount: args.amount,
        payload: args.payload ?? null,
      },
    });
  });

  return { ok: true };
}

// 只吃 roundId（你前面錯誤訊息就是多傳了 result）
export async function settleRound(roundId: string) {
  // 拿鎖避免多實例重算
  return withAdvisoryLock(999000 + hash(roundId), async () => {
    const round = await prisma.rouletteRound.findUnique({ where: { id: roundId } });
    if (!round) throw new Error("ROUND_NOT_FOUND");
    if (fromDbPhase(round.phase as SicBoPhase) === "SETTLED") return { ok: true, settled: true };

    if (round.result == null) throw new Error("RESULT_MISSING");

    const bets = await prisma.rouletteBet.findMany({ where: { roundId } });

    let totalPayout = 0;

    await prisma.$transaction(async (tx) => {
      for (const b of bets) {
        const multi = payoutMultiplier(b.kind, b.payload, round.result);
        if (multi > 0) {
          const win = Math.floor(b.amount * multi);
          totalPayout += win;

          await tx.user.update({
            where: { id: b.userId },
            data: { balance: { increment: win } },
          });
          await tx.ledger.create({
            data: {
              userId: b.userId,
              type: LedgerType.PAYOUT,
              target: BalanceTarget.WALLET,
              amount: win,
              meta: { game: "ROULETTE", roundId },
            },
          });
        }
      }

      await tx.rouletteRound.update({
        where: { id: roundId },
        data: {
          phase: toDbPhase("SETTLED"),
          endedAt: now(),
        },
      });
    });

    return { ok: true, totalPayout };
  });
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
