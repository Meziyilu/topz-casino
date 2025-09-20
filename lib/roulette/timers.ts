// lib/roulette/timers.ts
import type { RouletteRoomCode } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { GameCode } from '@prisma/client';

const DEFAULTS = {
  RL_R30_DRAW_INTERVAL_SEC: 40, // = 30s 投注 + 10s 揭示
  RL_R60_DRAW_INTERVAL_SEC: 40,
  RL_R90_DRAW_INTERVAL_SEC: 40,
  RL_BETTING_SEC: 30,
  RL_REVEAL_WINDOW_SEC: 10,
};

async function getInt(key: string, fallback: number): Promise<number> {
  const row = await prisma.gameConfig.findUnique({
    where: { gameCode_key: { gameCode: GameCode.GLOBAL, key } },
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

/** 依 startedAt + 設定推導當前 phase 與倒數 */
export function computePhase(
  startedAt: Date,
  timers: { drawIntervalSec: number; bettingSec: number; revealWindowSec: number; }
) {
  const now = Date.now();
  const t0 = startedAt.getTime();
  const bettingEnd = t0 + timers.bettingSec * 1000;
  const revealEnd  = bettingEnd + timers.revealWindowSec * 1000;

  let phase: 'BETTING' | 'REVEALING' | 'SETTLED';
  if (now < bettingEnd) phase = 'BETTING';
  else if (now < revealEnd) phase = 'REVEALING';
  else phase = 'SETTLED';

  const lockInSec   = Math.max(0, Math.ceil((bettingEnd - now) / 1000));
  const endInSec    = Math.max(0, Math.ceil((revealEnd  - now) / 1000));
  const revealInSec = Math.max(0, Math.ceil((revealEnd  - now) / 1000));

  return { phase, lockInSec, endInSec, revealInSec };
}
