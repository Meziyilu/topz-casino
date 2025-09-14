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

// 內建 addSeconds，避免外部相依
function addSeconds(d: Date, secs: number) {
  return new Date(d.getTime() + secs * 1000);
}

type State = {
  room: RoomCode;
  round: {
    id: string;
    seq: number;
    phase: "BETTING" | "REVEALING" | "SETTLED";
    startedAt: string;
    endsAt: string;
  };
  timers: { lockInSec: number; endInSec: number };
  locked: boolean;
  table: {
    banker: number[];
    player: number[];
    bankerThird?: number;
    playerThird?: number;
    total?: { player: number; banker: number };
    outcome?: string;
  };
  bead: ("BANKER" | "PLAYER" | "TIE")[];
};

const REVEAL_SEC = 8;
const BET_SEC = 30;

export async function ensureRoomSeed(room: RoomCode) {
  const meta = await prisma.gameConfig.findUnique({
    where: { gameCode_key: { gameCode: "BACCARAT", key: `room:${room}:shoeSeed` } },
  });
  if (!meta) {
    await prisma.gameConfig.create({
      data: { gameCode: "BACCARAT", key: `room:${room}:shoeSeed`, valueInt: Date.now() },
    });
  }
}

export async function currentState(room: RoomCode): Promise<State> {
  await ensureRoomSeed(room);

  let r = await prisma.round.findFirst({
    where: { room },
    orderBy: [{ startedAt: "desc" }],
  });

  const now = new Date();

  // 沒有局或上一局已結束 → 開新局
  if (!r || r.phase === "SETTLED") {
    const day = taipeiDay(now);
    const seq =
      (await prisma.round.count({ where: { room, day } })) + 1;
    const seed = await prisma.gameConfig.findUnique({
      where: { gameCode_key: { gameCode: "BACCARAT", key: `room:${room}:shoeSeed` } },
    });
    const shoe = initShoe(seed?.valueInt ?? Date.now());
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

  // 推進相位
  const phaseInfo = nextPhases(now, new Date(r.startedAt));

  if (phaseInfo.phase === "REVEALING" && r.phase === "BETTING") {
    // 進入開獎：發牌+保存結果
    const shoe = JSON.parse(r.shoeJson) as number[];
    const dealt = dealRound(shoe);
    await prisma.round.update({
      where: { id: r.id },
      data: {
        phase: "REVEALING",
        endsAt: addSeconds(new Date(r.startedAt), BET_SEC + REVEAL_SEC),
        resultJson: JSON.stringify(dealt),
        shoeJson: JSON.stringify(dealt.shoe),
      },
    });
    r = await prisma.round.findUnique({ where: { id: r.id } });
  }

  if (phaseInfo.phase === "SETTLED" && r.phase !== "SETTLED") {
    await settleRound(r.id);
    r = await prisma.round.update({
      where: { id: r.id },
      data: { phase: "SETTLED", outcome: extractOutcome(r.resultJson) ?? null, endedAt: new Date() },
    });
  }

  const result = r.resultJson ? (JSON.parse(r.resultJson) as DealResult) : null;

  // 路子（取最近 60 局）
  const bead = await prisma.round.findMany({
    where: { room, resultJson: { not: null } },
    orderBy: [{ startedAt: "desc" }],
    take: 60,
  });
  const beadList = bead.reverse().map((x) => {
    const d = JSON.parse(x.resultJson!) as DealResult;
    return d.outcome as "BANKER" | "PLAYER" | "TIE";
  });

  const np = nextPhases(new Date(), new Date(r.startedAt));

  return {
    room,
    round: {
      id: r.id,
      seq: r.seq,
      phase: r.phase as any,
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
    bead: beadList,
  };
}

function extractOutcome(resultJson?: string | null): "PLAYER" | "BANKER" | "TIE" | null {
  if (!resultJson) return null;
  try {
    const r = JSON.parse(resultJson) as DealResult;
    return r.outcome as any;
  } catch {
    return null;
  }
}

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

    await tx.bet.create({
      data: { userId, roundId, side, amount },
    });

    await tx.ledger.create({
      data: {
        userId,
        type: "BET_PLACED",
        target: "WALLET",     // ✅ 你的 Ledger 需要 target
        amount,
        room,
        roundId,
      },
    });
  });
}

export async function settleRound(roundId: string) {
  const r = await prisma.round.findUnique({ where: { id: roundId } });
  if (!r || !r.resultJson) return;

  const result = JSON.parse(r.resultJson) as DealResult;
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
            target: "WALLET",   // ✅ 同上
            amount: payout,
            room: r.room,
            roundId,
          },
        });
      }
    }
  });
}
