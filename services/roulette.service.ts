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

  // 沒有回合 → 建一個
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

  // 動態依「開始時間 + timers」推算實際階段；若不同步，更新一下 phase
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

  // 若資料庫 phase 落後，順手同步
  if (phase !== round.phase) {
    await prisma.rouletteRound.update({
      where: { id: round.id },
      data: { phase },
    });
  }

  // 回傳簡潔狀態（前端/Route 好用）
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

/** 後台/總覽資訊：各房間目前階段、近幾期、下注數量等（可按需擴充） */
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
  payload?: unknown; // 任意 JSON 結構（位置、覆蓋面等）
}) {
  const { userId, room, kind, amount, payload } = params;

  if (!isValidKind(kind)) {
    throw new Error("Invalid bet kind");
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Invalid amount");
  }

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
      // Prisma JSON 欄位
      payload: payload as any,
    },
  });

  return { ok: true, betId: bet.id, roundId: round.id };
}

/**
 * 結算：管理用途
 * - 若目前是 REVEALING → 產生結果（若無）
 * - 將回合標為 SETTLED（此版本為「最小可運作版」，不內建派彩；可在後續擴充將派彩寫入 Ledger）
 */
export async function settleRound(room: RouletteRoomCode) {
  const timers = await loadRoomTimers(room);
  let round = await getOrCreateCurrentRound(room);
  const phase = computePhase(new Date(round.startedAt), timers);

  // 若在 REVEALING 還沒有結果，可以在這裡決定結果
  if (phase === SicBoPhase.REVEALING && (round.result == null || round.phase !== SicBoPhase.REVEALING)) {
    // 這裡不引入 RNG 檔案，保守一點用簡單方式示範：0~36
    const pseudo = Math.floor(Math.random() * 37);
    round = await prisma.rouletteRound.update({
      where: { id: round.id },
      data: { result: pseudo, phase: SicBoPhase.REVEALING },
    });
  }

  // 標記為 SETTLED（不做派彩邏輯；之後若要派彩可在此彙總 bet → 產生 ledger/payout）
  round = await prisma.rouletteRound.update({
    where: { id: round.id },
    data: { phase: SicBoPhase.SETTLED, endedAt: new Date() },
  });

  const betCount = await prisma.rouletteBet.count({ where: { roundId: round.id } });

  return {
    ok: true,
    room,
    roundId: round.id,
    result: round.result,
    settledAt: round.endedAt,
    bets: betCount,
  };
}

/**（選用）建立下一回合，方便排程或後台手動切換 */
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
