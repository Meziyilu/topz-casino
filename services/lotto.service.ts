import { ensureAndProgressRound, formatPicksKey, loadConfig } from "@/lib/lotto";
import prisma from "@/lib/prisma";
import { BetStatus, LottoAttr, LottoBetKind, LottoRoundStatus } from "@prisma/client";

export async function getPublicState() {
  const now = new Date();
  const { round, cfg, locked } = await ensureAndProgressRound(now);
  return {
    current: {
      id: round.id,
      dayISO: round.day.toISOString(),
      code: round.code,
      drawAt: round.drawAt.toISOString(),
      status: round.status,
      numbers: (round.status === "DRAWN" || round.status === "SETTLED") ? round.numbers : [],
      special: (round.status === "DRAWN" || round.status === "SETTLED") ? (round.special ?? null) : null,
      pool: round.pool,
      jackpot: round.jackpot,
    },
    config: {
      drawIntervalSec: cfg.drawIntervalSec,
      lockBeforeDrawSec: cfg.lockBeforeDrawSec,
      picksCount: cfg.picksCount,
      pickMax: cfg.pickMax,
      betTiers: cfg.betTiers,
      bigThreshold: cfg.bigThreshold,
    },
    serverTime: now.toISOString(),
    locked,
  };
}

export type BetItem =
  | { kind: "PICKS"; picks: number[]; amount: number }
  | { kind: "SPECIAL_ODD" | "SPECIAL_EVEN" | "SPECIAL_BIG" | "SPECIAL_SMALL"; amount: number }
  | { kind: "BALL_ATTR"; ballIndex: number; attr: "BIG" | "SMALL" | "ODD" | "EVEN"; amount: number };

export async function placeBets(userId: string, items: BetItem[]) {
  const { round, cfg, locked } = await ensureAndProgressRound(new Date());
  if (locked || round.status !== LottoRoundStatus.OPEN) {
    return { ok: false, error: "ROUND_LOCKED" as const };
  }
  let total = 0;
  const normalized: BetItem[] = [];
  for (const it of items) {
    const amount = (it as { amount: number }).amount;
    if (!cfg.betTiers.includes(amount)) return { ok: false, error: "INVALID_AMOUNT" as const };
    if (it.kind === "PICKS") {
      const picks = [...new Set(it.picks)].sort((a, b) => a - b);
      if (picks.length !== cfg.picksCount) return { ok: false, error: "INVALID_PICKS_COUNT" as const };
      if (picks[0] < 1 || picks[picks.length - 1] > cfg.pickMax) return { ok: false, error: "PICK_OUT_OF_RANGE" as const };
      normalized.push({ kind: "PICKS", picks, amount });
    } else if (it.kind === "BALL_ATTR") {
      const idx = it.ballIndex;
      if (typeof idx !== "number" || idx < 1 || idx > cfg.picksCount) return { ok: false, error: "INVALID_BALL_INDEX" as const };
      if (!["BIG", "SMALL", "ODD", "EVEN"].includes(it.attr)) return { ok: false, error: "INVALID_ATTR" as const };
      normalized.push({ kind: "BALL_ATTR", ballIndex: idx, attr: it.attr, amount });
    } else {
      normalized.push({ kind: it.kind, amount });
    }
    total += amount;
  }
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { balance: true, bankBalance: true } });
  if (!user || user.balance < total) return { ok: false, error: "INSUFFICIENT_BALANCE" as const };

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        balance: { decrement: total },
        ledgers: {
          create: { type: "BET_PLACED", target: "WALLET", delta: -total, amount: total, memo: `Lotto ${round.code} BET (${normalized.length} items)`, balanceAfter: 0, bankAfter: user.bankBalance },
        },
      },
    });
    const after = await tx.user.findUnique({ where: { id: userId }, select: { balance: true } });
    await tx.ledger.updateMany({
      where: { userId, memo: `Lotto ${round.code} BET (${normalized.length} items)`, delta: -total },
      data: { balanceAfter: after?.balance ?? 0 },
    });

    for (const it of normalized) {
      if (it.kind === "PICKS") {
        const picksKey = formatPicksKey(it.picks);
        const exists = await tx.lottoBet.findUnique({
          where: { userId_roundId_kind_picksKey: { userId, roundId: round.id, kind: LottoBetKind.PICKS, picksKey } },
        });
        if (exists) {
          await tx.lottoBet.update({ where: { id: exists.id }, data: { amount: { increment: it.amount } } });
        } else {
          await tx.lottoBet.create({ data: { userId, roundId: round.id, kind: "PICKS", picks: it.picks, picksKey, amount: it.amount, status: BetStatus.PENDING } });
        }
      } else if (it.kind === "BALL_ATTR") {
        await tx.lottoBet.upsert({
          where: { userId_roundId_kind_ballIndex_attr: { userId, roundId: round.id, kind: "BALL_ATTR", ballIndex: it.ballIndex, attr: it.attr as LottoAttr } },
          update: { amount: { increment: it.amount } },
          create: { userId, roundId: round.id, kind: "BALL_ATTR", ballIndex: it.ballIndex, attr: it.attr as LottoAttr, amount: it.amount, status: BetStatus.PENDING },
        });
      } else {
        await tx.lottoBet.upsert({
          where: { userId_roundId_kind_picksKey: { userId, roundId: round.id, kind: it.kind as unknown as LottoBetKind, picksKey: "-" } },
          update: { amount: { increment: it.amount } },
          create: { userId, roundId: round.id, kind: it.kind as unknown as LottoBetKind, picks: [], picksKey: "-", amount: it.amount, status: BetStatus.PENDING },
        });
      }
    }
  });

  return { ok: true as const, code: round.code, total };
}
