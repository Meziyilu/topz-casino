// services/baccarat.service.ts
import { prisma } from "@/lib/prisma";
import {
  DealResult,
  nextPhases,
  initShoe,
  dealRound,
  settleOne,
  taipeiDay,
} from "@/lib/baccarat";
import type { BetSide, RoomCode, RoundPhase, RoundOutcome } from "@prisma/client";

// --------- 常數（管理端可覆蓋，沒設就用預設）---------
const DEFAULT_BET_SEC = 30;
const DEFAULT_REVEAL_SEC = 8;

// --------- 小工具 ---------
function addSeconds(d: Date, secs: number) {
  return new Date(d.getTime() + secs * 1000);
}

type Phase = "BETTING" | "REVEALING" | "SETTLED";

function parseResult(json?: string | null): DealResult | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as DealResult;
  } catch {
    return null;
  }
}
function extractOutcome(json?: string | null): RoundOutcome | null {
  const oc = parseResult(json)?.outcome;
  if (oc === "PLAYER" || oc === "BANKER" || oc === "TIE") return oc;
  return null;
}

function numberFromBigInt(b?: bigint | null): number | undefined {
  if (b === null || b === undefined) return undefined;
  return Number(b);
}

async function getSecondsConfig() {
  const keys = ["BACCARAT:betSeconds", "BACCARAT:revealSeconds"];
  const rows = await prisma.gameConfig.findMany({
    where: { gameCode: "BACCARAT", key: { in: keys } },
    select: { key: true, valueInt: true, valueFloat: true },
  });
  const kv = new Map<string, number>();
  for (const r of rows) {
    const intVal = numberFromBigInt(r.valueInt);
    const v =
      typeof intVal === "number" && !Number.isNaN(intVal)
        ? intVal
        : typeof r.valueFloat === "number"
        ? r.valueFloat
        : undefined;
    if (typeof v === "number") kv.set(r.key, v);
  }
  const BET_SEC = Math.max(1, Math.floor(kv.get("BACCARAT:betSeconds") ?? DEFAULT_BET_SEC));
  const REVEAL_SEC = Math.max(
    1,
    Math.floor(kv.get("BACCARAT:revealSeconds") ?? DEFAULT_REVEAL_SEC),
  );
  return { BET_SEC, REVEAL_SEC };
}

// 房間 seed：使用 BigInt（以「秒」時間戳），避免 INT4 溢位
export async function ensureRoomSeed(room: RoomCode) {
  const key = `room:${room}:shoeSeed`;
  await prisma.gameConfig.upsert({
    where: { gameCode_key: { gameCode: "BACCARAT", key } },
    create: { gameCode: "BACCARAT", key, valueInt: BigInt(Math.floor(Date.now() / 1000)) },
    update: {},
  });
}

async function openNewRound(room: RoomCode, BET_SEC: number, REVEAL_SEC: number) {
  const now = new Date();
  const day = taipeiDay(now); // 以台北時區日切
  const seq = (await prisma.round.count({ where: { room, day } })) + 1;

  // 讀房間 seed，讀不到就用現在時間（秒）
  const seedRow = await prisma.gameConfig.findUnique({
    where: { gameCode_key: { gameCode: "BACCARAT", key: `room:${room}:shoeSeed` } },
    select: { valueInt: true },
  });
  const seed = numberFromBigInt(seedRow?.valueInt) ?? Math.floor(Date.now() / 1000);
  const shoe = initShoe(seed);

  const round = await prisma.round.create({
    data: {
      room,
      phase: "BETTING",
      day,
      seq,
      startedAt: now,
      endsAt: addSeconds(now, BET_SEC + REVEAL_SEC),
      shoeJson: JSON.stringify(shoe),
      outcome: null,
    },
  });

  return round;
}

// --------- 對外：取得目前狀態（會自動推進相位）---------
export async function currentState(room: RoomCode) {
  await ensureRoomSeed(room);
  const { BET_SEC, REVEAL_SEC } = await getSecondsConfig();

  let r = await prisma.round.findFirst({
    where: { room },
    orderBy: [{ startedAt: "desc" }],
  });

  const now = new Date();

  // 沒局或上一局已結束 → 直接開新局
  if (!r || r.phase === "SETTLED") {
    r = await openNewRound(room, BET_SEC, REVEAL_SEC);
  }

  // 依 startedAt 推相位
  const cur = nextPhases(now, new Date(r.startedAt));

  // 進入開獎：發牌 + 寫入結果
  if (cur.phase === "REVEALING" && r.phase === "BETTING") {
    const dealt = (() => {
      try {
        const shoe = JSON.parse(r!.shoeJson) as number[];
        return dealRound(shoe);
      } catch {
        return dealRound(initShoe(Math.floor(Date.now() / 1000)));
      }
    })();

    await prisma.round.updateMany({
      where: { id: r.id, phase: "BETTING" },
      data: {
        phase: "REVEALING",
        endsAt: addSeconds(new Date(r.startedAt), BET_SEC + REVEAL_SEC),
        resultJson: JSON.stringify(dealt),
        shoeJson: JSON.stringify(dealt.shoe),
      },
    });

    r = await prisma.round.findUnique({ where: { id: r.id } });
  }

  // 進入結算：派彩 + 結束時間
  const cur2 = nextPhases(new Date(), new Date(r.startedAt));
  if (cur2.phase === "SETTLED" && r.phase !== "SETTLED") {
    await settleRound(r.id);
    const outcome = extractOutcome(r.resultJson);
    await prisma.round.updateMany({
      where: { id: r.id, NOT: { phase: "SETTLED" } },
      data: { phase: "SETTLED", outcome, endedAt: new Date() },
    });
    r = await prisma.round.findUnique({ where: { id: r.id } });
  }

  const result = parseResult(r.resultJson);

  // 取最近 60 局做珠盤路
  const beadRows = await prisma.round.findMany({
    where: { room, resultJson: { not: null } },
    orderBy: [{ startedAt: "desc" }],
    take: 60,
    select: { resultJson: true },
  });
  const bead = beadRows.reverse().map((x) => (parseResult(x.resultJson)?.outcome ?? "TIE"));

  const np = nextPhases(new Date(), new Date(r.startedAt));

  return {
    room,
    round: {
      id: r.id,
      seq: r.seq,
      phase: r.phase as Phase,
      startedAt: r.startedAt.toISOString(),
      endsAt: r.endsAt.toISOString(),
    },
    timers: { lockInSec: Math.max(0, np.lockInSec), endInSec: Math.max(0, np.endInSec) },
    locked: np.locked,
    table: result
      ? {
          banker: result.cards.banker,
          player: result.cards.player,
          bankerThird: result.cards.bankerThird ?? undefined,
          playerThird: result.cards.playerThird ?? undefined,
          total: result.total,
          outcome: result.outcome,
        }
      : { banker: [], player: [] },
    bead,
  };
}

// --------- 對外：目前狀態 + 我的下注 ---------
export async function getCurrentStateWithMyBets(room: RoomCode, userId: string) {
  const state = await currentState(room);

  const myBets = await prisma.bet.findMany({
    where: { userId, roundId: state.round.id },
    orderBy: { createdAt: "asc" },
  });

  const myBetList = myBets.map((b) => ({
    id: b.id,
    side: b.side as BetSide,
    amount: b.amount,
    createdAt: b.createdAt.toISOString(),
  }));

  // 總額（前端常用）
  const total = myBetList.reduce((acc, b) => acc + b.amount, 0);

  return { ...state, myBets: myBetList, myTotalAmount: total };
}

// --------- 下注 ---------
export async function placeBet(
  userId: string,
  room: RoomCode,
  roundId: string,
  side: BetSide,
  amount: number,
) {
  const round = await prisma.round.findUnique({ where: { id: roundId } });
  if (!round) throw new Error("ROUND_NOT_FOUND");

  // 依相位判斷是否鎖單
  const phase = nextPhases(new Date(), new Date(round.startedAt));
  if (phase.locked) throw new Error("BET_LOCKED");
  if (amount <= 0) throw new Error("INVALID_AMOUNT");

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId }, select: { balance: true } });
    if (!user || user.balance < amount) throw new Error("INSUFFICIENT_BALANCE");

    await tx.user.update({
      where: { id: userId },
      data: { balance: { decrement: amount } },
    });

    const bet = await tx.bet.create({
      data: { userId, roundId, side, amount },
    });

    await tx.ledger.create({
      data: {
        userId,
        type: "BET_PLACED",
        target: "WALLET",
        amount,
        room,
        roundId,
      },
    });

    return bet;
  });
}

// --------- 結算 ---------
export async function settleRound(roundId: string) {
  const r = await prisma.round.findUnique({ where: { id: roundId } });
  if (!r || !r.resultJson) return;

  const result = parseResult(r.resultJson);
  if (!result) return;

  const bets = await prisma.bet.findMany({ where: { roundId } });

  await prisma.$transaction(async (tx) => {
    for (const b of bets) {
      const payout = settleOne({ side: b.side as any, amount: b.amount }, result) ?? 0;
      if (payout > 0) {
        await tx.user.update({
          where: { id: b.userId },
          data: { balance: { increment: payout } },
        });
        await tx.ledger.create({
          data: {
            userId: b.userId,
            type: "PAYOUT",
            target: "WALLET",
            amount: payout,
            room: r.room,
            roundId,
          },
        });
      }
    }
  });
}

// --------- 歷史 / 公開資料 ---------
export async function getPublicRounds(room: RoomCode, limit = 20) {
  const rounds = await prisma.round.findMany({
    where: { room, resultJson: { not: null } },
    orderBy: { startedAt: "desc" },
    take: limit,
  });

  return rounds.map((r) => ({
    id: r.id,
    seq: r.seq,
    startedAt: r.startedAt.toISOString(),
    outcome: r.outcome,
    result: r.resultJson ? JSON.parse(r.resultJson) : null,
  }));
}

export async function getMyBets(userId: string, limit = 10) {
  const bets = await prisma.bet.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { round: true },
  });

  return bets.map((b) => ({
    id: b.id,
    roundId: b.roundId,
    side: b.side as BetSide,
    amount: b.amount,
    createdAt: b.createdAt.toISOString(),
    outcome: b.round?.outcome ?? null,
    result: b.round?.resultJson ? JSON.parse(b.round.resultJson) : null,
  }));
}

// --------- 房間資訊（給大廳 / 管理端用）---------
export async function getRooms() {
  const { BET_SEC, REVEAL_SEC } = await getSecondsConfig();

  // 可選：讀是否啟用
  const enabledRows = await prisma.gameConfig.findMany({
    where: {
      gameCode: "BACCARAT",
      key: { in: ["BACCARAT:R30:enabled", "BACCARAT:R60:enabled", "BACCARAT:R90:enabled"] },
    },
    select: { key: true, valueBool: true },
  });
  const enabledMap = new Map<string, boolean>();
  for (const r of enabledRows) enabledMap.set(r.key, !!r.valueBool);

  const rooms: RoomCode[] = ["R30", "R60", "R90"];
  return rooms.map((code) => ({
    code,
    enabled: enabledMap.get(`BACCARAT:${code}:enabled`) ?? true,
    betSeconds: BET_SEC,
    revealSeconds: REVEAL_SEC,
  }));
}

export async function getRoomInfo(room: RoomCode) {
  const [state, history] = await Promise.all([currentState(room), getPublicRounds(room, 20)]);
  return { state, history };
}

export async function getCurrentRound(room: RoomCode) {
  const st = await currentState(room);
  return st.round;
}

// --------- 管理端：重置房間（強制結束當局）---------
export async function resetRoom(room: RoomCode) {
  const cur = await prisma.round.findFirst({
    where: { room },
    orderBy: [{ startedAt: "desc" }],
  });
  if (cur && cur.phase !== "SETTLED") {
    await prisma.round.update({
      where: { id: cur.id },
      data: { phase: "SETTLED", endedAt: new Date() },
    });
  }
  return { ok: true };
}
