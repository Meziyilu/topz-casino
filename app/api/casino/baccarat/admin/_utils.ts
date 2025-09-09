// app/api/casino/baccarat/admin/_utils.ts
import { prisma } from "@/lib/prisma";
import type { BetSide, RoomCode, LedgerType } from "@prisma/client";

/** 允許的房 */
export const ROOMS: RoomCode[] = ["R30", "R60", "R90"];

/** 臨時配置（記憶體） */
const memoryConfig: Record<RoomCode, { betSeconds: number; revealSeconds: number }> = {
  R30: { betSeconds: 30, revealSeconds: 5 },
  R60: { betSeconds: 60, revealSeconds: 5 },
  R90: { betSeconds: 90, revealSeconds: 5 },
};
export function getConfig(room: RoomCode) {
  return memoryConfig[room];
}
export function setConfig(room: RoomCode, betSeconds?: number, revealSeconds?: number) {
  if (betSeconds && betSeconds > 3) memoryConfig[room].betSeconds = Math.min(Math.max(betSeconds, 5), 600);
  if (revealSeconds && revealSeconds >= 0) memoryConfig[room].revealSeconds = Math.min(Math.max(revealSeconds, 0), 60);
  return memoryConfig[room];
}

/** 真實百家樂發牌（不存 DB，只回本次用） */
type SimpleCard = { r: number; s: number }; // rank 1..13, suit 0..3
type Outcome = "PLAYER" | "BANKER" | "TIE";
export type DealResult = {
  outcome: Outcome; pPts: number; bPts: number;
  cards: { player: SimpleCard[]; banker: SimpleCard[] };
  flags: { playerPair: boolean; bankerPair: boolean; anyPair: boolean; perfectPair: boolean; super6: boolean };
};
const point = (r: number) => (r >= 10 ? 0 : r === 1 ? 1 : r);
function rng(seed: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => {
    h += 0x6D2B79F5;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function draw(rand: () => number): SimpleCard { return { r: Math.floor(rand() * 13) + 1, s: Math.floor(rand() * 4) }; }

export function dealBaccarat(seed: string): DealResult {
  const rand = rng(seed);
  const P: SimpleCard[] = [draw(rand), draw(rand)];
  const B: SimpleCard[] = [draw(rand), draw(rand)];
  const p2 = (point(P[0].r) + point(P[1].r)) % 10;
  const b2 = (point(B[0].r) + point(B[1].r)) % 10;
  let p3: SimpleCard | undefined, b3: SimpleCard | undefined;

  // 依百家樂第三張規則（簡化但合理）：
  if (p2 <= 5) p3 = draw(rand);
  const pPts = (p2 + (p3 ? point(p3.r) : 0)) % 10;

  if (!p3) { if (b2 <= 5) b3 = draw(rand); }
  else {
    if (b2 <= 2) b3 = draw(rand);
    else if (b2 === 3 && p3.r !== 8) b3 = draw(rand);
    else if (b2 === 4 && p3.r >= 2 && p3.r <= 7) b3 = draw(rand);
    else if (b2 === 5 && p3.r >= 4 && p3.r <= 7) b3 = draw(rand);
    else if (b2 === 6 && (p3.r === 6 || p3.r === 7)) b3 = draw(rand);
  }
  const bPts = (b2 + (b3 ? point(b3.r) : 0)) % 10;

  const outcome: Outcome = pPts === bPts ? "TIE" : pPts > bPts ? "PLAYER" : "BANKER";
  const rankEq = (a?: SimpleCard, b?: SimpleCard) => !!(a && b && a.r === b.r);
  const suitEq = (a?: SimpleCard, b?: SimpleCard) => !!(a && b && a.s === b.s);
  const playerPair = rankEq(P[0], P[1]);
  const bankerPair = rankEq(B[0], B[1]);
  const perfectPair = (playerPair && suitEq(P[0], P[1])) || (bankerPair && suitEq(B[0], B[1]));
  const anyPair = playerPair || bankerPair;
  const super6 = outcome === "BANKER" && bPts === 6;

  return { outcome, pPts, bPts, cards: { player: [P[0], P[1], ...(p3 ? [p3] : [])], banker: [B[0], B[1], ...(b3 ? [b3] : [])] }, flags: { playerPair, bankerPair, anyPair, perfectPair, super6 } };
}

/** 依結果/旗標計算賠率（抽水規則可再調） */
export function oddsFor(side: BetSide, res: DealResult): number {
  switch (side) {
    case "PLAYER": return res.outcome === "PLAYER" ? 1 : 0;
    case "BANKER": {
      if (res.outcome !== "BANKER") return 0;
      // 可選：莊贏6點半賠，這裡示例仍給 1 倍（你要半賠就改 0.5）
      return res.flags.super6 ? 1 : 1;
    }
    case "TIE": return res.outcome === "TIE" ? 8 : 0;
    case "PLAYER_PAIR": return res.flags.playerPair ? 11 : 0;
    case "BANKER_PAIR": return res.flags.bankerPair ? 11 : 0;
    case "ANY_PAIR": return res.flags.anyPair ? 5 : 0;
    case "PERFECT_PAIR": return res.flags.perfectPair ? 25 : 0;
    case "BANKER_SUPER_SIX": return res.flags.super6 ? 12 : 0;
    default: return 0;
  }
}

/** 取該房間尚未結算的最新回合 */
export async function getActiveRound(room: RoomCode) {
  return prisma.round.findFirst({
    where: { room, NOT: { phase: "SETTLED" } },
    orderBy: { startedAt: "desc" },
  });
}

/** 退款（用 PAYOUT 記） */
export async function refundUsers(tx: typeof prisma, bets: { userId: string; amount: number }[]) {
  const agg: Record<string, number> = {};
  for (const b of bets) agg[b.userId] = (agg[b.userId] ?? 0) + b.amount;
  for (const [uid, amt] of Object.entries(agg)) {
    if (amt > 0) {
      await tx.user.update({ where: { id: uid }, data: { balance: { increment: amt } } });
      await tx.ledger.create({ data: { userId: uid, type: "PAYOUT" as LedgerType, target: "WALLET", amount: amt } });
    }
  }
}

/** 結算派彩 */
export async function settleRoundTx(roundId: string, res: DealResult) {
  await prisma.$transaction(async (tx) => {
    const bets = await tx.bet.findMany({ where: { roundId } });
    const pay: Record<string, number> = {};
    for (const b of bets) {
      const odd = oddsFor(b.side as BetSide, res);
      const prize = Math.floor(b.amount * odd);
      if (prize > 0) pay[b.userId] = (pay[b.userId] ?? 0) + prize;
    }
    for (const [uid, amt] of Object.entries(pay)) {
      await tx.user.update({ where: { id: uid }, data: { balance: { increment: amt } } });
      await tx.ledger.create({ data: { userId: uid, type: "PAYOUT" as LedgerType, target: "WALLET", amount: amt } });
    }
    await tx.round.update({ where: { id: roundId }, data: { phase: "SETTLED", outcome: res.outcome, endedAt: new Date() } });
  });
}
