// lib/roulette/timers.ts
import { prisma } from "@/lib/prisma";
import { GameCode, RouletteRoomCode, SicBoPhase } from "@prisma/client";

// 你提的規則：30 秒下注 + 10 秒動畫 = 40 秒一輪
export const BETTING_MS = 30_000;
export const REVEAL_MS  = 10_000;
export const CYCLE_MS   = BETTING_MS + REVEAL_MS;

export type Phase = "BETTING" | "REVEALING" | "SETTLED";

export function now() { return new Date(); }

export function computePhase(startsAt: Date) {
  const t0 = startsAt.getTime();
  const t  = Date.now();
  const dt = t - t0;

  if (dt < 0) return { phase: "BETTING" as Phase, msLeft: BETTING_MS, sinceMs: 0 };

  const mod = dt % CYCLE_MS;
  if (mod < BETTING_MS) {
    return { phase: "BETTING" as Phase, msLeft: BETTING_MS - mod, sinceMs: mod };
  }
  const inReveal = mod - BETTING_MS;
  if (inReveal < REVEAL_MS) {
    return { phase: "REVEALING" as Phase, msLeft: REVEAL_MS - inReveal, sinceMs: mod };
  }
  // 正常不會到這；保底回 BETTING
  return { phase: "BETTING" as Phase, msLeft: 1000, sinceMs: mod };
}

// 讓 Roulette 用到 SicBoPhase 的 schema，不改 DB：做轉換
export function toDbPhase(p: Phase): SicBoPhase {
  if (p === "BETTING") return "BETTING";
  if (p === "REVEALING") return "REVEALING";
  return "SETTLED";
}

export function fromDbPhase(p: SicBoPhase): Phase {
  if (p === "BETTING") return "BETTING";
  if (p === "REVEALING") return "REVEALING";
  return "SETTLED";
}

// 讀全域配置（可選：沒值就用 fallback）
export async function getGlobalInt(key: string, fallback: number) {
  const row = await prisma.gameConfig.findUnique({
    where: { gameCode_key: { gameCode: GameCode.GLOBAL, key } },
  });
  const v = row?.valueInt;
  return typeof v === "bigint" ? Number(v) : (v ?? fallback);
}
