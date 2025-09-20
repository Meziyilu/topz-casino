// lib/roulette/timers.ts
import { prisma } from "@/lib/prisma";
import { GameCode, RouletteRoomCode, SicBoPhase } from "@prisma/client";

/**
 * 下注 / 開獎 / 結算 時間（毫秒）
 */
export type RouletteTimers = {
  betMs: number;
  revealMs: number;
  settleMs: number;
  cycleMs: number;
};

/**
 * 預設時間（毫秒）— 依房間不同可有不同週期
 * RL_R30  → 30s = 20s 下注 + 7s 開獎 + 3s 結算（舉例）
 * RL_R60  → 60s
 * RL_R90  → 90s
 */
const DEFAULT_TIMERS: Record<RouletteRoomCode, RouletteTimers> = {
  RL_R30: { betMs: 20_000, revealMs: 7_000, settleMs: 3_000, cycleMs: 30_000 },
  RL_R60: { betMs: 45_000, revealMs: 10_000, settleMs: 5_000, cycleMs: 60_000 },
  RL_R90: { betMs: 70_000, revealMs: 15_000, settleMs: 5_000, cycleMs: 90_000 },
};

/**
 * 讀取 GameConfig 的數值（優先房間覆寫 → 全域 → fallback）
 * - Prisma 欄位 valueInt 是 BigInt，可安全轉成 number
 * - 唯一鍵：@@unique([gameCode, key]) → findUnique({ where: { gameCode_key: {…} } })
 */
async function getInt(key: string, fallback: number): Promise<number> {
  const row = await prisma.gameConfig.findUnique({
    where: { gameCode_key: { gameCode: GameCode.GLOBAL, key } },
  });
  if (!row) return fallback;
  if (row.valueInt != null) return Number(row.valueInt); // BigInt → number
  if (row.valueString != null && !Number.isNaN(Number(row.valueString))) {
    return Number(row.valueString);
  }
  return fallback;
}

/**
 * 組 key：先看房間專屬，再看全域
 * ex:
 *  - roulette.RL_R30.betMs
 *  - roulette.betMs
 */
async function getRoomOverride(
  room: RouletteRoomCode,
  leafKey: "betMs" | "revealMs" | "settleMs",
  fallback: number
): Promise<number> {
  const roomKey = `roulette.${room}.${leafKey}`;
  const globalKey = `roulette.${leafKey}`;

  // 房間覆寫
  const roomValue = await prisma.gameConfig.findUnique({
    where: { gameCode_key: { gameCode: GameCode.GLOBAL, key: roomKey } },
  });
  if (roomValue?.valueInt != null) return Number(roomValue.valueInt);
  if (roomValue?.valueString != null && !Number.isNaN(Number(roomValue.valueString))) {
    return Number(roomValue.valueString);
  }

  // 全域設定
  return getInt(globalKey, fallback);
}

/**
 * 載入房間的計時（可被 GameConfig 覆寫）
 */
export async function loadRoomTimers(room: RouletteRoomCode): Promise<RouletteTimers> {
  const d = DEFAULT_TIMERS[room];

  const betMs = await getRoomOverride(room, "betMs", d.betMs);
  const revealMs = await getRoomOverride(room, "revealMs", d.revealMs);
  const settleMs = await getRoomOverride(room, "settleMs", d.settleMs);

  const cycleMs = betMs + revealMs + settleMs;
  return { betMs, revealMs, settleMs, cycleMs };
}

/**
 * 根據回合開始時間與計時取得目前階段
 * - 輪盤沿用 SicBoPhase：BETTING / REVEALING / SETTLED
 */
export function computePhase(startedAt: Date, timers: RouletteTimers, nowTs?: number): SicBoPhase {
  const now = nowTs ?? Date.now();
  const elapsed = (now - startedAt.getTime()) % timers.cycleMs;

  if (elapsed < timers.betMs) return SicBoPhase.BETTING;
  if (elapsed < timers.betMs + timers.revealMs) return SicBoPhase.REVEALING;
  return SicBoPhase.SETTLED;
}

/**
 * 可選：回傳目前階段剩餘毫秒（方便前端倒數）
 */
export function msUntilNextPhase(startedAt: Date, timers: RouletteTimers, nowTs?: number): number {
  const now = nowTs ?? Date.now();
  const elapsed = (now - startedAt.getTime()) % timers.cycleMs;

  if (elapsed < timers.betMs) return timers.betMs - elapsed;
  if (elapsed < timers.betMs + timers.revealMs) return timers.betMs + timers.revealMs - elapsed;
  return timers.cycleMs - elapsed; // until next cycle (end of SETTLED → back to BETTING)
}
