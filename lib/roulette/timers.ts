// lib/roulette/timers.ts
import type { RouletteRoomCode } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { GameCode } from '@prisma/client'; // ⬅ 新增

const DEFAULTS = {
  RL_R30_DRAW_INTERVAL_SEC: 40,
  RL_R60_DRAW_INTERVAL_SEC: 40,
  RL_R90_DRAW_INTERVAL_SEC: 40,
  RL_BETTING_SEC: 30,
  RL_REVEAL_WINDOW_SEC: 10,
};

async function getInt(key: string, fallback: number): Promise<number> {
  const row = await prisma.gameConfig.findUnique({
    where: { gameCode_key: { gameCode: GameCode.GLOBAL, key } }, // ⬅ 這裡改 enum
  });
  return row?.valueInt ?? fallback;
}

export async function loadRoomTimers(room: RouletteRoomCode) {
  const drawKey =
    room === 'RL_R30' ? 'RL_R30_DRAW_INTERVAL_SEC' :
    room === 'RL_R60' ? 'RL_R60_DRAW_INTERVAL_SEC' : 'RL_R90_DRAW_INTERVAL_SEC';

  const [drawIntervalSec, bettingSec, revealWindowSec] = await Promise.all([
    getInt(drawKey, DEFAULTS[drawKey as keyof typeof DEFAULTS]),
    getInt('RL_BETTING_SEC', DEFAULTS.RL_BETTING_SEC),
    getInt('RL_REVEAL_WINDOW_SEC', DEFAULTS.RL_REVEAL_WINDOW_SEC),
  ]);

  const safeDraw = Math.max(drawIntervalSec, bettingSec + revealWindowSec);
  return { drawIntervalSec: safeDraw, bettingSec, revealWindowSec };
}
