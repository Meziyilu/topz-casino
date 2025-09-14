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

/** 確保每個房間都有 seed（洗牌種子） */
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

/** 取得目前狀態（必要時自動開新局 / 推進局相位） */
export async function currentState(room: RoomCode): Promise<State> {
  await ensureRoomSeed(room);

  // 取最新一局
  let r = await prisma.round.findFirst({
    where: { room },
    orderBy: [{ startedAt: "desc" }],
  });

  const now = new Date();

  // 沒有局或上一局已結束 → 開新局
  if (!r || r.phase === "SETTLED") {
    const day = taipeiDay(now);
    const seq = (await prisma.round.count({ where: { room, day } })) + 1;
    const seedCfg = await prisma.gameConfig.findUnique({
      where: { gameCode_key: { gameCode: "BACCARAT", key: `room:${room}:shoeSeed` } },
    });
    const shoe = initShoe(seedCfg?.valueInt ?? Date.now());

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

  // 計算當前相位（根據 startedAt）
  const np0 = nextPhases(now, new Date(r.startedAt));

  // ---- 原子轉場：BETTING -> REVEALING（避免多請求重複發牌） ----
  if (np0.phase === "REVEALING" && r.phase === "BETTING") {
    // 在同一筆交易內先讀取牌靴並發牌
    const dealt = (() => {
      try {
        const shoe = JSON.parse(r!.shoeJson) as number[];
        return dealRound(shoe);
      } catch {
        // 異常時重新初始化一副牌，避免整桌卡住
        const fallbackShoe = initShoe(Date.now());
        return dealRound(fallbackShoe);
      }
    })();

    const updated = await prisma.round.updateMany({
      where: { id: r.id, phase: "BETTING" }, // 條件：仍是 BETTING 才允許切換
      data: {
        phase: "REVEALING",
        endsAt: addSeconds(new Date(r.startedAt), BET_SEC + REVEAL_SEC),
        resultJson: JSON.stringify(dealt),
        shoeJson: JSON.stringify(dealt.shoe),
      },
    });

    if (updated > 0) {
      r = await prisma.round.findUnique({ where: { id: r.id } });
    } else {
      // 其他請求已經切過相位；再拉一次最新資料
      r = await prisma.round.findUnique({ where: { id: r.id } });
    }
  }

  // 重新計算相位（可能剛切過）
  const np1 = nextPhases(new Date(), new Date(r.startedAt));

  // ---- 原子轉場：-> SETTLED（只做一次結算） ----
  if (np1.phase === "SETTLED" && r.phase !== "SETTLED") {
    await settleRound(r.id);

    // 從結果萃取 outcome
    const outcome = extractOutcome(r.resultJson);

    await prisma.round.updateMany({
      where: { id: r.id, NOT: { phase: "SETTLED" } },
      data: { phase: "SETTLED", outcome: (outcome as any) ?? null, endedAt: new Date() },
    });

    r = await prisma.round.findUnique({ where: { id: r.id } });
  }

  const result = parseResult(r.resultJson);

  // 路子（取最近 60 局，老到新）
  const beadRows = await prisma.round.findMany({
    where: { room, resultJson: { not: null } },
    orderBy: [{ startedAt: "desc" }],
    take: 60,
    select: { resultJson: true },
  });
  const beadList = beadRows.reverse().map((x) => {
    const d = parseResult(x.resultJson);
    return (d?.outcome ?? "TIE") as "BANKER" | "PLAYER" | "TIE";
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

function parseResult(json?: string | null): DealResult | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as DealResult;
  } catch {
    return null;
  }
}

function extractOutcome(json?: string | null): "PLAYER" | "BANKER" | "TIE" | null {
  const r = parseResult(json);
  return (r?.outcome as any) ?? null;
}

/** 下單（下注） */
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
        target: "WALLET", // Ledger 需要 target
        amount,
        room,
        roundId,
      },
    });
  });
}

/** 結算一局（派彩） */
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
