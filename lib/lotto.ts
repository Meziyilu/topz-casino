import prisma from "@/lib/prisma";
import { taipeiDayStartUTC } from "@/lib/utils";
import { Prisma, LottoRoundStatus, LottoBetKind, LottoAttr, BetStatus } from "@prisma/client";

/** 設定型別（儲存在 GameConfig.value，key="lotto.config"） */
export type LottoConfig = {
  drawIntervalSec: number;
  lockBeforeDrawSec: number;
  picksCount: number;
  pickMax: number;
  betTiers: number[];
  bigThreshold: number;
  odds: {
    picks: { M6?: number; M5?: number; M4?: number; M3?: number };
    special: { odd: number; even: number; big: number; small: number };
    ballAttr: { big: number; small: number; odd: number; even: number };
  };
  rakeBp: number; // 乘數後的抽成，basis points（例 300=3%）
  poolBp: number; // 下注累積入獎池比例（例 100=1%）
};

const DEFAULT_CONFIG: LottoConfig = {
  drawIntervalSec: 20,
  lockBeforeDrawSec: 5,
  picksCount: 6,
  pickMax: 49,
  betTiers: [10, 50, 100, 500, 1000, 5000],
  bigThreshold: 25,
  odds: {
    picks: { M6: 100000, M5: 2000, M4: 100, M3: 5 },
    special: { odd: 19, even: 19, big: 19, small: 19 },
    ballAttr: { big: 19, small: 19, odd: 19, even: 19 },
  },
  rakeBp: 300,
  poolBp: 100,
};

export async function loadConfig(): Promise<LottoConfig> {
  const row = await prisma.gameConfig.findUnique({ where: { key: "lotto.config" } });
  if (!row) return DEFAULT_CONFIG;
  const merged = { ...DEFAULT_CONFIG, ...(row.value as Partial<LottoConfig>) };
  return {
    ...merged,
    odds: {
      picks: { ...DEFAULT_CONFIG.odds.picks, ...(merged.odds?.picks ?? {}) },
      special: { ...DEFAULT_CONFIG.odds.special, ...(merged.odds?.special ?? {}) },
      ballAttr: { ...DEFAULT_CONFIG.odds.ballAttr, ...(merged.odds?.ballAttr ?? {}) },
    },
  };
}

export async function saveConfig(nextValue: LottoConfig): Promise<void> {
  await prisma.gameConfig.upsert({
    where: { key: "lotto.config" },
    update: { value: nextValue },
    create: { key: "lotto.config", value: nextValue },
  });
}

function isLocked(now: Date, drawAt: Date, lockSec: number): boolean {
  return now.getTime() >= drawAt.getTime() - lockSec * 1000;
}
function randInt(minInc: number, maxInc: number): number {
  const min = Math.ceil(minInc);
  const max = Math.floor(maxInc);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
export function drawNumbers(picksCount: number, pickMax: number): { numbers: number[]; special: number } {
  const set = new Set<number>();
  while (set.size < picksCount) set.add(randInt(1, pickMax));
  const numbers = [...set].sort((a, b) => a - b);
  let special = randInt(1, pickMax);
  while (set.has(special)) special = randInt(1, pickMax);
  return { numbers, special };
}
function isBig(n: number, threshold: number): boolean { return n >= threshold; }
function isOdd(n: number): boolean { return (n % 2) !== 0; }
function picksMatchCount(picks: number[], opened: number[]): number {
  let m = 0; for (const v of picks) if (opened.includes(v)) m += 1; return m;
}

type SettlementResult = { totalBet: number; totalPayout: number; jackpot: number };

export function formatPicksKey(picks: number[]): string {
  return [...picks].sort((a, b) => a - b).join("-");
}

/** 結算（需在交易上下文內呼叫） */
export async function settleRoundTx(roundId: string, cfg: LottoConfig): Promise<SettlementResult> {
  const round = await prisma.lottoRound.findUnique({ where: { id: roundId } });
  if (!round || round.status !== LottoRoundStatus.DRAWN || !round.special) {
    return { totalBet: 0, totalPayout: 0, jackpot: 0 };
  }
  const bets = await prisma.lottoBet.findMany({ where: { roundId, status: BetStatus.PENDING } });
  if (bets.length === 0) return { totalBet: 0, totalPayout: 0, jackpot: 0 };

  const opened = round.numbers;
  const special = round.special;
  const { bigThreshold } = cfg;

  let totalBet = 0;
  let totalPayout = 0;
  let jackpot = 0;

  for (const b of bets) {
    totalBet += b.amount;
    let matched = 0;
    let won = false;
    let multiplier = 0;

    if (b.kind === LottoBetKind.PICKS) {
      matched = picksMatchCount(b.picks, opened);
      if (matched >= 6 && cfg.odds.picks.M6) { multiplier = cfg.odds.picks.M6; won = true; jackpot += Math.floor(b.amount * multiplier); }
      else if (matched === 5 && cfg.odds.picks.M5) { multiplier = cfg.odds.picks.M5; won = true; }
      else if (matched === 4 && cfg.odds.picks.M4) { multiplier = cfg.odds.picks.M4; won = true; }
      else if (matched === 3 && cfg.odds.picks.M3) { multiplier = cfg.odds.picks.M3; won = true; }
    } else if (b.kind === LottoBetKind.SPECIAL_ODD) {
      won = isOdd(special); multiplier = cfg.odds.special.odd;
    } else if (b.kind === LottoBetKind.SPECIAL_EVEN) {
      won = !isOdd(special); multiplier = cfg.odds.special.even;
    } else if (b.kind === LottoBetKind.SPECIAL_BIG) {
      won = isBig(special, bigThreshold); multiplier = cfg.odds.special.big;
    } else if (b.kind === LottoBetKind.SPECIAL_SMALL) {
      won = !isBig(special, bigThreshold); multiplier = cfg.odds.special.small;
    } else if (b.kind === LottoBetKind.BALL_ATTR && b.ballIndex && b.attr) {
      const idx = b.ballIndex - 1;
      const val = opened[idx] ?? 0;
      const attr = b.attr;
      if (attr === LottoAttr.BIG) { won = isBig(val, bigThreshold); multiplier = cfg.odds.ballAttr.big; }
      if (attr === LottoAttr.SMALL) { won = !isBig(val, bigThreshold); multiplier = cfg.odds.ballAttr.small; }
      if (attr === LottoAttr.ODD) { won = isOdd(val); multiplier = cfg.odds.ballAttr.odd; }
      if (attr === LottoAttr.EVEN) { won = !isOdd(val); multiplier = cfg.odds.ballAttr.even; }
    }

    const gross = won ? Math.floor(b.amount * multiplier) : 0;
    const rake = won ? Math.floor((gross * cfg.rakeBp) / 10000) : 0;
    const payout = Math.max(gross - rake, 0);
    totalPayout += payout;

    await prisma.lottoBet.update({
      where: { id: b.id },
      data: { status: won ? BetStatus.PAID : BetStatus.LOST, payout, matched, hitSpecial: won && (b.kind !== LottoBetKind.PICKS) },
    });

    if (payout > 0) {
      await prisma.user.update({
        where: { id: b.userId },
        data: {
          balance: { increment: payout },
          ledgers: {
            create: {
              type: "PAYOUT",
              target: "WALLET",
              delta: payout,
              memo: `Lotto ${round.code} PAYOUT (${b.kind})`,
              balanceAfter: 0,
              bankAfter: 0,
            },
          },
        },
      });
      const u = await prisma.user.findUnique({ where: { id: b.userId }, select: { balance: true, bankBalance: true } });
      await prisma.ledger.updateMany({
        where: { userId: b.userId, memo: `Lotto ${round.code} PAYOUT (${b.kind})`, delta: payout },
        data: { balanceAfter: u?.balance ?? 0, bankAfter: u?.bankBalance ?? 0 },
      });
    }
  }

  const poolIncrease = Math.floor((totalBet * cfg.poolBp) / 10000);
  await prisma.lottoRound.update({
    where: { id: round.id },
    data: { status: LottoRoundStatus.SETTLED, jackpot, pool: round.pool + poolIncrease },
  });

  return { totalBet, totalPayout, jackpot: Math.min(jackpot, round.pool + poolIncrease) };
}

/** 取得/推進當期（台北日重置 code，跨日結轉 pool） */
export async function ensureAndProgressRound(now: Date): Promise<{
  round: Prisma.LottoRoundGetPayload<{ select: { id: true; day: true; code: true; drawAt: true; status: true; numbers: true; special: true; pool: true; jackpot: true } }>;
  cfg: LottoConfig;
  locked: boolean;
}> {
  const cfg = await loadConfig();
  const today = taipeiDayStartUTC(now);

  let round = await prisma.lottoRound.findFirst({
    where: { day: today },
    orderBy: [{ code: "desc" }],
    select: { id: true, day: true, code: true, drawAt: true, status: true, numbers: true, special: true, pool: true, jackpot: true },
  });

  if (!round) {
    const last = await prisma.lottoRound.findFirst({ orderBy: [{ day: "desc" }, { code: "desc" }], select: { pool: true, jackpot: true } });
    const carryOver = Math.max((last?.pool ?? 0) - (last?.jackpot ?? 0), 0);
    const drawAt = new Date(now.getTime() + cfg.drawIntervalSec * 1000);
    round = await prisma.lottoRound.create({
      data: { day: today, code: 1, drawAt, status: LottoRoundStatus.OPEN, numbers: [], special: null, pool: carryOver, jackpot: 0 },
      select: { id: true, day: true, code: true, drawAt: true, status: true, numbers: true, special: true, pool: true, jackpot: true },
    });
  }

  if (round.status === LottoRoundStatus.OPEN && isLocked(now, round.drawAt, cfg.lockBeforeDrawSec)) {
    round = await prisma.lottoRound.update({ where: { id: round.id }, data: { status: LottoRoundStatus.LOCKED },
      select: { id: true, day: true, code: true, drawAt: true, status: true, numbers: true, special: true, pool: true, jackpot: true } });
  }

  if ((round.status === LottoRoundStatus.OPEN || round.status === LottoRoundStatus.LOCKED) && now.getTime() >= round.drawAt.getTime()) {
    const { numbers, special } = drawNumbers(cfg.picksCount, cfg.pickMax);
    round = await prisma.lottoRound.update({
      where: { id: round.id },
      data: { status: LottoRoundStatus.DRAWN, numbers, special },
      select: { id: true, day: true, code: true, drawAt: true, status: true, numbers: true, special: true, pool: true, jackpot: true },
    });

    await settleRoundTx(round.id, cfg);
    round = await prisma.lottoRound.findUniqueOrThrow({
      where: { id: round.id },
      select: { id: true, day: true, code: true, drawAt: true, status: true, numbers: true, special: true, pool: true, jackpot: true },
    });

    const nextDrawAt = new Date(round.drawAt.getTime() + cfg.drawIntervalSec * 1000);
    const nextDay = taipeiDayStartUTC(nextDrawAt);
    const nextIsNewDay = nextDay.getTime() !== round.day.getTime();
    const leftover = Math.max(round.pool - round.jackpot, 0);
    const nextCode = nextIsNewDay ? 1 : round.code + 1;

    await prisma.lottoRound.create({
      data: { day: nextDay, code: nextCode, drawAt: nextDrawAt, status: LottoRoundStatus.OPEN, numbers: [], special: null, pool: leftover, jackpot: 0 },
    });
  }

  const locked = isLocked(now, round.drawAt, cfg.lockBeforeDrawSec);
  return { round, cfg, locked };
}
