import { prisma } from "@/lib/prisma";
import {
  DealResult,
  RoomCode,
  nextPhases,
  initShoe,
  dealRound,
  settleOne,
  taipeiDay,
  BetSide,
} from "@/lib/baccarat";

// 內建 addSeconds
function addSeconds(d: Date, secs: number) {
  return new Date(d.getTime() + secs * 1000);
}

type Phase = "BETTING" | "REVEALING" | "SETTLED";

const REVEAL_SEC = 8;
const BET_SEC = 30;

// ✅ 改：用秒數存 seed，避免 INT4 溢位
export async function ensureRoomSeed(room: RoomCode) {
  const key = `room:${room}:shoeSeed`;
  const meta = await prisma.gameConfig.findUnique({
    where: { gameCode_key: { gameCode: "BACCARAT", key } },
  });
  if (!meta) {
    await prisma.gameConfig.create({
      data: { gameCode: "BACCARAT", key, valueInt: Math.floor(Date.now() / 1000) },
    });
  }
}

function parseResult(json?: string | null): DealResult | null {
  if (!json) return null;
  try { return JSON.parse(json) as DealResult; } catch { return null; }
}
function extractOutcome(json?: string | null): "PLAYER"|"BANKER"|"TIE"|null {
  const r = parseResult(json); return (r?.outcome as any) ?? null;
}

/** 狀態：必要時自動開新局/推進相位 */
export async function currentState(room: RoomCode) {
  await ensureRoomSeed(room);

  let r = await prisma.round.findFirst({
    where: { room },
    orderBy: [{ startedAt: "desc" }],
  });

  const now = new Date();

  // 沒有局或已結束 → 開新局
  if (!r || r.phase === "SETTLED") {
    const day = taipeiDay(now);
    const seq = (await prisma.round.count({ where: { room, day } })) + 1;
    const seedCfg = await prisma.gameConfig.findUnique({
      where: { gameCode_key: { gameCode: "BACCARAT", key: `room:${room}:shoeSeed` } },
      select: { valueInt: true },
    });
    const seed = Number(seedCfg?.valueInt ?? Math.floor(Date.now() / 1000));
    const shoe = initShoe(seed);
    r = await prisma.round.create({
      data: {
        room,
        phase: "BETTING",
        day,
        seq,
        startedAt: now,
        endsAt: addSeconds(now, BET_SEC + REVEAL_SEC),
        shoeJson: JSON.stringify(shoe),
      },
    });
  }

  const np0 = nextPhases(now, new Date(r.startedAt));
  if (np0.phase === "REVEALING" && r.phase === "BETTING") {
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

  const np1 = nextPhases(new Date(), new Date(r.startedAt));
  if (np1.phase === "SETTLED" && r.phase !== "SETTLED") {
    await settleRound(r.id);
    const outcome = extractOutcome(r.resultJson);
    await prisma.round.updateMany({
      where: { id: r.id, NOT: { phase: "SETTLED" } },
      data: { phase: "SETTLED", outcome: (outcome as any) ?? null, endedAt: new Date() },
    });
    r = await prisma.round.findUnique({ where: { id: r.id } });
  }

  const result = parseResult(r.resultJson);

  const beadRows = await prisma.round.findMany({
    where: { room, resultJson: { not: null } },
    orderBy: [{ startedAt: "desc" }],
    take: 60,
    select: { resultJson: true },
  });
  const bead = beadRows.reverse().map(x => {
    const d = parseResult(x.resultJson);
    return (d?.outcome ?? "TIE") as any;
  });

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

/** 下單 */
export async function placeBet(
  userId: string,
  room: RoomCode,
  roundId: string,
  side: BetSide,
  amount: number
) {
  const round = await prisma.round.findUnique({ where: { id: roundId } });
  if (!round) throw new Error("ROUND_NOT_FOUND");
  const phase = nextPhases(new Date(), new Date(round.startedAt));
  if (phase.locked) throw new Error("BET_LOCKED");
  if (amount <= 0) throw new Error("INVALID_AMOUNT");

  await prisma.$transaction(async (tx) => {
    const u = await tx.user.findUnique({ where: { id: userId }, select: { balance: true } });
    if (!u || u.balance < amount) throw new Error("INSUFFICIENT_BALANCE");

    await tx.user.update({ where: { id: userId }, data: { balance: { decrement: amount } } });

    await tx.bet.create({ data: { userId, roundId, side, amount } });

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
  });
}

/** 結算 */
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
        await tx.user.update({ where: { id: b.userId }, data: { balance: { increment: payout } } });
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

// 取我的下注紀錄
export async function getMyBets(userId: string, limit = 10) {
  return prisma.bet.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { round: true },
  });
}

// 取公共歷史局
export async function getPublicRounds(room: RoomCode, limit = 20) {
  return prisma.round.findMany({
    where: { room, resultJson: { not: null } },
    orderBy: { startedAt: "desc" },
    take: limit,
  });
}

// 管理端：重置房間
export async function resetRoom(room: RoomCode) {
  const cur = await prisma.round.findFirst({ where: { room }, orderBy: { startedAt: "desc" } });
  if (cur) {
    await prisma.round.update({ where: { id: cur.id }, data: { phase: "SETTLED" } });
  }
  return { ok: true };
}
