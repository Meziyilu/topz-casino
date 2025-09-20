// lib/roulette/timers.ts
import { prisma } from "@/lib/prisma";
import { GameCode, RouletteRoomCode } from "@prisma/client";

async function getConfigInt(key: string, fallback: number): Promise<number> {
  const row = await prisma.gameConfig.findUnique({
    where: { gameCode_key: { gameCode: GameCode.GLOBAL, key } },
  });

  const v = row?.valueInt; // v: bigint | null | undefined
  return v != null ? Number(v) : fallback; // 明確轉成 number
}

export async function loadRoomTimers(room: RouletteRoomCode) {
  const bettingMs = await getConfigInt(`roulette.${room}.bettingMs`, 30_000);
  const revealMs  = await getConfigInt(`roulette.${room}.revealMs`, 5_000);
  const settleMs  = await getConfigInt(`roulette.${room}.settleMs`, 3_000);

  return { bettingMs, revealMs, settleMs }; // 全都是 number
}
