// lib/roulette/timers.ts
import { prisma } from "@/lib/prisma";
import { GameCode, RouletteRoomCode, SicBoPhase } from "@prisma/client";

export type RoomTimers = {
  bettingMs: number;
  revealMs: number;
  settleMs: number;
};

// 取整數設定（DB 是 BigInt -> 轉 number）
async function getConfigInt(key: string, fallback: number): Promise<number> {
  const row = await prisma.gameConfig.findUnique({
    where: { gameCode_key: { gameCode: GameCode.GLOBAL, key } },
  });
  const v = row?.valueInt; // bigint | null | undefined
  return v != null ? Number(v) : fallback;
}

export async function loadRoomTimers(room: RouletteRoomCode): Promise<RoomTimers> {
  const bettingMs = await getConfigInt(`roulette.${room}.bettingMs`, 30_000);
  const revealMs  = await getConfigInt(`roulette.${room}.revealMs`,   5_000);
  const settleMs  = await getConfigInt(`roulette.${room}.settleMs`,   3_000);
  return { bettingMs, revealMs, settleMs };
}

/**
 * 根據 round.startedAt 與各階段時長，計算目前階段
 * elapsed < bettingMs         -> BETTING
 * bettingMs <= elapsed < sum  -> REVEALING
 * elapsed >= sum              -> SETTLED
 */
export function computePhase(
  startedAt: Date,
  timers: RoomTimers,
  now: Date = new Date()
): SicBoPhase {
  const startTs = new Date(startedAt).getTime();
  const elapsed = now.getTime() - startTs;

  const bettingEnd = timers.bettingMs;
  const revealEnd  = timers.bettingMs + timers.revealMs;

  if (elapsed < bettingEnd) return SicBoPhase.BETTING;
  if (elapsed < revealEnd)  return SicBoPhase.REVEALING;
  return SicBoPhase.SETTLED;
}

// （可選）若你在別處需要知道回合什麼時候結束，可以一起輸出這個
export function computeEndsAt(startedAt: Date, timers: RoomTimers): Date {
  const total = timers.bettingMs + timers.revealMs + timers.settleMs;
  return new Date(new Date(startedAt).getTime() + total);
}
