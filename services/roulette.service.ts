// services/roulette.service.ts
import { prisma } from "@/lib/prisma";
import {
  RouletteRoomCode,
  RouletteBetKind,
  SicBoPhase,
  GameCode,
} from "@prisma/client";
import {
  loadRoomTimers,
  computePhase,
  msUntilNextPhase,
  RouletteTimers,
} from "@/lib/roulette/timers";

/** 依房間載入（或建立）目前回合 */
async function getOrCreateCurrentRound(room: RouletteRoomCode) {
  let round = await prisma.rouletteRound.findFirst({
    where: { room },
    orderBy: { startedAt: "desc" },
  });

  if (!round) {
    const now = new Date();
    round = await prisma.rouletteRound.create({
      data: {
        room,
        phase: SicBoPhase.BETTING,
        startedAt: now,
      },
    });
    return round;
  }

  const timers = await loadRoomTimers(room);
  const phase = computePhase(new Date(round.startedAt), timers);
  if (phase !== round.phase) {
    round = await prisma.rouletteRound.update({
      where: { id: round.id },
      data: { phase },
    });
  }
  return round;
}

/** 驗證下注種類 */
function isValidKind(kind: RouletteBetKind): boolean {
  return Object.values(RouletteBetKind).includes(kind);
}

/** 取得目前房間狀態（回合 + 計時 + 倒數） */
export async function getState(room: RouletteRoomCode) {
  const timers = await loadRoomTimers(room);
  const round = await getOrCreateCurrentRound(room);

  const phase = computePhase(new Date(round.startedAt), timers);
  const msLeft = msUntilNextPhase(new Date(round.startedAt), timers);

  if (phase !== round.phase) {
    await prisma.rouletteRound.update({
      where: { id: round.id },
      data: { phase },
    });
  }

  return {
    room,
    round: {
      id: round.id,
      phase,
      result: round.result,
      startedAt: round.startedAt,
      endedAt: round.endedAt,
    },
    timers,
    msLeft,
  };
}

/** 後台/總覽資訊 */
export async function getOverview() {
  const rooms = Object.values(RouletteRoomCode) as RouletteRoomCode[];
  const out: Array<{
    room: RouletteRoomCode;
    phase: SicBoPhase;
    msLeft: number;
    timers: RouletteTimers;
    lastRounds: Array<{ id: string; result: number | null; startedAt: Date }>;
    openBets: number;
  }> = [];

  for (const room of rooms) {
    const timers = await loadRoomTimers(room);
    const round = await getOrCreateCurrentRound(room);
    const phase = computePhase(new Date(round.startedAt), timers);
    const msLeft = msUntilNextPhase(new Date(round.startedAt), timers);

    const [lastRounds, openBets] = await Promise.all([
      prisma.rouletteRound.findMany({
        where: { room },
        orderBy: { startedAt: "desc" },
        take: 5,
        select: { id: true, result: true, startedAt: true },
      }),
      prisma.rouletteBet.count({
        where: { roundId: round.id },
      }),
    ]);

    out.push({
      room,
      phase,
      msLeft,
      timers,
      lastRounds,
      openBets,
    });
  }

  return { rooms: out };
}

/** 下注：只允許在 BETTING 階段 */
export async function placeBet(params: {
  userId: string;
  room: RouletteRoomCode;
  kind: RouletteBetKind;
  amount: number;
  payload?: unknown;
}) {
  const { userId, room, kind, amount, payload } = params;

  if (!isValidKind(kind)) throw new Error("Invalid bet kind");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Invalid amount");

  const timers = await loadRoomTimers(room);
  const round = await getOrCreateCurrentRound(room);
  const phase = computePhase(new Date(round.startedAt), timers);

  if (phase !== SicBoPhase.BETTING) {
    throw new Error("Betting is closed for this round");
  }

  const bet = await prisma.rouletteBet.create({
    data: {
      userId,
      roundId: round.id,
      kind,
      amount: Math.floor(amount),
      payload: payload as any,
    },
  });

  return { ok: true, betId: bet.id, roundId: round.id };
}

/**
 * 結算（新版簽名）：依 roundId 結算，允許可選的 forcedResult。
 * - 若該回合尚無結果，會採用 forcedResult（若提供且 0..36），否則隨機 0..36。
 * - 最後把 round 標記為 SETTLED。
 */
export async function settleRound(roundId: string, forcedResult?: number) {
  let round = await prisma.rouletteRound.findUnique({ where: { id: roundId } });
  if (!round) throw new Error("ROUND_NOT_FOUND");

  const timers = await loadRoomTimers(round.room);
  const phase = computePhase(new Date(round.startedAt), timers);

  let finalResult = round.result ?? null;

  if (finalResult == null) {
    if (typeof forcedResult === "number") {
      if (!Number.isInteger(forcedResult) || forcedResult < 0 || forcedResult > 36) {
        throw new Error("INVALID_RESULT");
      }
      finalResult = forcedResult;
    } else if (phase === SicBoPhase.REVEALING || phase === SicBoPhase.BETTING) {
      finalResult = Math.floor(Math.random() * 37); // 0..36
    } else {
      // 已在 SETTLED 但沒結果的奇異狀況，仍給一個值（或你也可以直接丟錯）
      finalResult = Math.floor(Math.random() * 37);
    }
  }

  round = await prisma.rouletteRound.update({
    where: { id: round.id },
    data: {
      result: finalResult,
      phase: SicBoPhase.SETTLED,
      endedAt: new Date(),
    },
  });

  const betCount = await prisma.rouletteBet.count({ where: { roundId: round.id } });

  return {
    ok: true,
    room: round.room,
    roundId: round.id,
    result: round.result,
    settledAt: round.endedAt,
    bets: betCount,
  };
}

/**（選用）建立下一回合 */
export async function startNextRound(room: RouletteRoomCode) {
  const now = new Date();
  const next = await prisma.rouletteRound.create({
    data: {
      room,
      phase: SicBoPhase.BETTING,
      startedAt: now,
      result: null,
      endedAt: null,
    },
  });
  return { ok: true, roundId: next.id };
}
