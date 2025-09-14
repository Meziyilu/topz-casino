// services/lotto.service.ts
export const runtime = "nodejs";

import prisma from "@/lib/prisma";

type DrawStatus = "OPEN" | "LOCKED" | "DRAWN" | "SETTLED";

export type LottoConfig = {
  drawIntervalSec: number;      // 每局間隔（預設 30）
  lockBeforeDrawSec: number;    // 開獎前鎖盤秒數（預設 5）
  picksCount: number;           // 每注選幾顆（預設 6）
  pickMax: number;              // 最大號碼（預設 49）
  betTiers: number[];           // 可選注金面額（前端顯示）
};

export const DEFAULT_CONFIG: LottoConfig = {
  drawIntervalSec: 30,
  lockBeforeDrawSec: 5,
  picksCount: 6,
  pickMax: 49,
  betTiers: [10, 50, 100, 200, 500, 1000],
};

// 🔹 幫助函式：安全轉 number
function asNumber(v: number | bigint | null | undefined, d: number): number {
  if (typeof v === "bigint") return Number(v);
  if (typeof v === "number") return v;
  return d;
}

// 以 GameConfig 覆寫預設
export async function readConfig(): Promise<LottoConfig> {
  const rows = await prisma.gameConfig.findMany({ where: { gameCode: "LOTTO" } });
  const map = new Map(rows.map(r => [r.key, r]));
  const getInt = (k: string, d: number) => asNumber(map.get(k)?.valueInt, d);
  const getJson = <T,>(k: string, d: T) => (map.get(k)?.json as T) ?? d;

  return {
    drawIntervalSec: getInt("drawIntervalSec", DEFAULT_CONFIG.drawIntervalSec),
    lockBeforeDrawSec: getInt("lockBeforeDrawSec", DEFAULT_CONFIG.lockBeforeDrawSec),
    picksCount: getInt("picksCount", DEFAULT_CONFIG.picksCount),
    pickMax: getInt("pickMax", DEFAULT_CONFIG.pickMax),
    betTiers: getJson<number[]>("betTiers", DEFAULT_CONFIG.betTiers),
  };
}

export async function writeConfig(partial: Partial<LottoConfig>) {
  const entries: [keyof LottoConfig, any][] = Object.entries(partial) as any;
  await prisma.$transaction(entries.map(([k, v]) => prisma.gameConfig.upsert({
    where: { gameCode_key: { gameCode: "LOTTO", key: String(k) } },
    update: typeof v === "number" ? { valueInt: v } :
            Array.isArray(v)     ? { json: v } :
            typeof v === "boolean" ? { valueBool: v } :
            { valueString: String(v) },
    create: {
      gameCode: "LOTTO",
      key: String(k),
      ...(typeof v === "number" ? { valueInt: v } :
         Array.isArray(v)       ? { json: v } :
         typeof v === "boolean" ? { valueBool: v } :
         { valueString: String(v) })
    }
  })));
}

// 亂數
export function rngInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function drawNumbers(picksCount: number, pickMax: number): { numbers: number[]; special: number } {
  const pool = Array.from({ length: pickMax }, (_, i) => i + 1);
  const numbers: number[] = [];
  for (let i = 0; i < picksCount; i++) {
    const idx = rngInt(0, pool.length - 1);
    numbers.push(pool[idx]);
    pool.splice(idx, 1);
  }
  numbers.sort((a, b) => a - b);
  const idx = rngInt(0, pool.length - 1);
  const special = pool[idx];
  return { numbers, special };
}

// 賠率表
const PAY_TABLE: Record<number, number> = { 3: 2, 4: 10, 5: 100, 6: 1000 };

export function matchCount(win: number[], pick: number[]): number {
  const set = new Set(win);
  return pick.reduce((acc, n) => acc + (set.has(n) ? 1 : 0), 0);
}

export async function ensureOpenDraw(now: Date, cfg: LottoConfig) {
  const existing = await prisma.lottoDraw.findFirst({
    where: { status: { in: ["OPEN", "LOCKED"] } },
    orderBy: { drawAt: "asc" },
  });
  if (existing) return existing;

  const last = await prisma.lottoDraw.findFirst({ orderBy: { drawAt: "desc" } });
  const nextCode = (last?.code ?? 0) + 1;
  const drawAt = new Date(now.getTime() + cfg.drawIntervalSec * 1000);
  return prisma.lottoDraw.create({
    data: {
      code: nextCode,
      drawAt,
      numbers: [],
      special: null,
      pool: 0,
      jackpot: 0,
      status: "OPEN",
    }
  });
}

export async function lockIfNeeded(now: Date, cfg: LottoConfig) {
  const draw = await prisma.lottoDraw.findFirst({
    where: { status: "OPEN" },
    orderBy: { drawAt: "asc" },
  });
  if (!draw) return;

  const lockAt = new Date(draw.drawAt.getTime() - cfg.lockBeforeDrawSec * 1000);
  if (now >= lockAt) {
    await prisma.lottoDraw.update({ where: { id: draw.id }, data: { status: "LOCKED" } });
  }
}

export async function drawIfDue(now: Date, cfg: LottoConfig) {
  const due = await prisma.lottoDraw.findFirst({
    where: { status: "LOCKED", drawAt: { lte: now } },
    orderBy: { drawAt: "asc" },
  });
  if (!due) return null;

  const { numbers, special } = drawNumbers(cfg.picksCount, cfg.pickMax);
  return prisma.lottoDraw.update({
    where: { id: due.id },
    data: { status: "DRAWN", numbers, special },
  });
}

export async function settleIfDrawn() {
  const drawn = await prisma.lottoDraw.findFirst({
    where: { status: "DRAWN" },
    orderBy: { drawAt: "asc" },
  });
  if (!drawn) return;

  const bets = await prisma.lottoBet.findMany({ where: { drawId: drawn.id } });
  if (bets.length === 0) {
    await prisma.lottoDraw.update({ where: { id: drawn.id }, data: { status: "SETTLED" } });
    return;
  }

  const winners: { userId: string; amount: number }[] = [];
  for (const b of bets) {
    const m = matchCount(drawn.numbers, b.picks);
    const mult = PAY_TABLE[m] ?? 0;
    if (mult > 0) {
      winners.push({ userId: b.userId, amount: b.amount * mult });
    }
  }

  await prisma.$transaction(async (tx) => {
    for (const w of winners) {
      await tx.user.update({
        where: { id: w.userId },
        data: { balance: { increment: w.amount } },
      });
      await tx.ledger.create({
        data: {
          userId: w.userId,
          type: "PAYOUT",
          target: "WALLET",
          amount: w.amount,
          roundId: drawn.id,
        }
      });
    }
    await tx.lottoDraw.update({ where: { id: drawn.id }, data: { status: "SETTLED" } });
  });
}

export async function placeBet(params: { userId: string; amount: number; picks: number[]; special?: number | null; }) {
  const cfg = await readConfig();
  if (params.picks.length !== cfg.picksCount) throw new Error(`需要選 ${cfg.picksCount} 顆號碼`);

  const draw = await prisma.lottoDraw.findFirst({ where: { status: "OPEN" }, orderBy: { drawAt: "asc" } });
  if (!draw) throw new Error("目前沒有開放下注的場次");

  return prisma.$transaction(async (tx) => {
    const u = await tx.user.findUnique({ where: { id: params.userId } });
    if (!u) throw new Error("無此使用者");
    if (u.balance < params.amount) throw new Error("餘額不足");

    await tx.user.update({
      where: { id: u.id },
      data: { balance: { decrement: params.amount } }
    });
    await tx.ledger.create({
      data: {
        userId: u.id,
        type: "BET_PLACED",
        target: "WALLET",
        amount: params.amount,
        roundId: draw.id,
      }
    });

    const bet = await tx.lottoBet.create({
      data: {
        userId: u.id,
        drawId: draw.id,
        picks: params.picks,
        special: params.special ?? null,
        amount: params.amount,
      }
    });

    await tx.lottoDraw.update({
      where: { id: draw.id },
      data: {
        pool: draw.pool + Math.floor(params.amount * 0.5),
        jackpot: draw.jackpot + Math.floor(params.amount * 0.05),
      }
    });

    return { bet, drawId: draw.id, drawAt: draw.drawAt };
  });
}
