// lib/lotto.ts
import { randomInt } from "crypto";
import prisma from "@/lib/prisma";

export type LottoConfig = {
  drawIntervalSec: number;        // 300
  lockBeforeDrawSec: number;      // 15
  picksCount: number;             // 6
  pickMax: number;                // 49
  bigThreshold: number;           // 25：1~24小、25~49大
  betTiers: number[];             // [10,50,100,500,1000]
  rakeBps: number;                // 500=5%
  poolInBps: number;              // 2000=20%
  payout: {
    match6: { poolPercent: number; x: number };
    match5s: { x: number };
    match5: { x: number };
    match4: { x: number };
    match3: { x: number };
    specialOddEven: { x: number };
    ballAttr: { x: number };
  };
};

export async function getLottoConfig(): Promise<LottoConfig> {
  const row = await prisma.gameConfig.findUnique({ where: { key: "lotto.config" } });
  const def: LottoConfig = {
    drawIntervalSec: 300,
    lockBeforeDrawSec: 15,
    picksCount: 6,
    pickMax: 49,
    bigThreshold: 25,
    betTiers: [10,50,100,500,1000],
    rakeBps: 500,
    poolInBps: 2000,
    payout: {
      match6: { poolPercent: 70, x: 0 },
      match5s: { x: 400 },
      match5: { x: 120 },
      match4: { x: 12 },
      match3: { x: 2 },
      specialOddEven: { x: 1.9 },
      ballAttr: { x: 1.95 },
    },
  };
  if (!row) return def;
  return Object.assign(def, row.value as any);
}

export function drawNumbers(pickMax=49) {
  const bag = Array.from({length: pickMax}, (_,i)=>i+1);
  const take = (n:number)=>{ const out:number[]=[]; for(let i=0;i<n;i++){ const j=randomInt(0,bag.length); out.push(bag.splice(j,1)[0]); } return out; };
  const numbers = take(6).sort((a,b)=>a-b);
  const special  = take(1)[0];
  return { numbers, special };
}

export function picksKey(picks: number[]) {
  return picks.slice().sort((a,b)=>a-b).join("-");
}

export function isLocked(now: Date, drawAt: Date, lockBeforeSec: number) {
  return (drawAt.getTime() - now.getTime()) <= lockBeforeSec*1000;
}

export function nextDrawAt(from?: Date, intervalSec=300) {
  const base = from ? new Date(from) : new Date();
  const ms = Math.ceil(base.getTime() / (intervalSec*1000)) * (intervalSec*1000);
  return new Date(ms);
}

export function isBig(n:number, threshold:number){ return n >= threshold; }
export function isOdd(n:number){ return (n % 2) === 1; }

export async function ensureCurrentRound() {
  const cfg = await getLottoConfig();
  const now = new Date();
  const drawAt = nextDrawAt(now, cfg.drawIntervalSec);
  const last = await prisma.lottoRound.findFirst({ orderBy: { code: "desc" } });

  if (!last) {
    const created = await prisma.lottoRound.create({ data: { code: 1, drawAt, status: "OPEN" }});
    return { round: created, cfg };
  }
  if (last.drawAt.getTime() !== drawAt.getTime()) {
    if (now.getTime() >= last.drawAt.getTime() && (last.status === "DRAWN" || last.status === "SETTLED")) {
      const created = await prisma.lottoRound.create({ data: { code: last.code + 1, drawAt, status: "OPEN" }});
      return { round: created, cfg };
    }
  }
  return { round: last, cfg };
}

export async function settleRound(roundId: string) {
  const cfg = await getLottoConfig();
  const round = await prisma.lottoRound.findUnique({ where: { id: roundId } });
  if (!round) throw new Error("Round not found");
  if (!round.numbers || round.numbers.length !== 6 || !round.special) throw new Error("Round not drawn yet");

  const bets = await prisma.lottoBet.findMany({ where: { roundId } });
  const setNums = new Set(round.numbers);
  const specialOdd = isOdd(round.special);
  const bigThr = cfg.bigThreshold;

  let jackpotWinners = 0;
  let jackpotTotalPayout = 0;
  let pool = round.pool;

  const calc = bets.map(b => {
    let matched = 0, hitSpecial = false, basePayout = 0;

    if (b.kind === "PICKS") {
      matched = (b.picks||[]).reduce((a,n)=>a+(setNums.has(n)?1:0),0);
      hitSpecial = b.picks?.includes(round.special!) ?? false;

      const x =
        matched === 6 ? 0 :
        matched === 5 && hitSpecial ? cfg.payout.match5s.x :
        matched === 5 ? cfg.payout.match5.x :
        matched === 4 ? cfg.payout.match4.x :
        matched === 3 ? cfg.payout.match3.x : 0;

      basePayout = Math.floor(b.amount * x);
      if (matched === 6) jackpotWinners++;
    }
    else if (b.kind === "SPECIAL_ODD" || b.kind === "SPECIAL_EVEN") {
      const win = (b.kind === "SPECIAL_ODD") ? specialOdd : !specialOdd;
      if (win) basePayout = Math.floor(b.amount * cfg.payout.specialOddEven.x);
    }
    else if (b.kind === "BALL_ATTR") {
      if (!b.ballIndex || !b.attr) return { id:b.id, matched, hitSpecial, basePayout };
      const idx = b.ballIndex - 1; const ball = round.numbers[idx];
      if (!ball) return { id:b.id, matched, hitSpecial, basePayout };
      const win =
        (b.attr === "BIG" && isBig(ball, bigThr)) ||
        (b.attr === "SMALL" && !isBig(ball, bigThr)) ||
        (b.attr === "ODD" && isOdd(ball)) ||
        (b.attr === "EVEN" && !isOdd(ball));
      if (win) basePayout = Math.floor(b.amount * cfg.payout.ballAttr.x);
    }

    return { id:b.id, matched, hitSpecial, basePayout };
  });

  if (jackpotWinners > 0) {
    const alloc = Math.floor(pool * (cfg.payout.match6.poolPercent / 100));
    const eachPool = Math.floor(alloc / jackpotWinners);
    const fixed = Math.floor(cfg.payout.match6.x);
    for (const c of calc) {
      if (c.matched === 6) {
        const b = bets.find(x=>x.id===c.id)!;
        c.basePayout += eachPool + (fixed>0? Math.floor(b.amount*fixed): 0);
        jackpotTotalPayout += eachPool + (fixed>0? Math.floor(b.amount*fixed): 0);
      }
    }
    pool -= alloc;
  }

  await prisma.$transaction(async (tx) => {
    for (const c of calc) {
      const b = bets.find(x=>x.id===c.id)!;
      const won = c.basePayout > 0;

      if (won) {
        const me = await tx.user.update({
          where: { id: b.userId },
          data: { balance: { increment: c.basePayout } },
          select: { balance: true, bankBalance: true }
        });
        await tx.ledger.create({
          data: {
            userId: b.userId,
            type: "PAYOUT",
            target: "WALLET",
            delta: c.basePayout,
            memo: `LOTTO payout #${round.code} (${b.kind}${b.kind==="PICKS"?" "+(b.picksKey): b.kind==="BALL_ATTR" ? ` B${b.ballIndex}/${b.attr}` : ""})`,
            balanceAfter: me.balance,
            bankAfter: me.bankBalance,
          } as any
        });
      }

      await tx.lottoBet.update({
        where: { id: b.id },
        data: {
          status: won ? "WON" : "LOST",
          matched: c.matched,
          hitSpecial: c.hitSpecial,
          payout: c.basePayout,
        }
      });
    }

    await tx.lottoRound.update({
      where: { id: roundId },
      data: { status: "SETTLED", pool, jackpot: jackpotTotalPayout }
    });
  });

  return {
    code: round.code,
    numbers: round.numbers,
    special: round.special,
    jackpotWinners,
    jackpotTotalPayout,
    poolAfter: pool
  };
}
