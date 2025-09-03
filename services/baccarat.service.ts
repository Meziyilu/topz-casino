// services/baccarat.service.ts
import prisma from "@/lib/prisma";
import { getBaccaratRoomConfig, setBaccaratRoomConfig } from "@/lib/game-config";
import { seeded, taipeiDayStartUTC } from "@/lib/utils";
import type { BetSide, RoundOutcome, RoundPhase, RoomCode } from "@prisma/client";

/** 預設設定（可被 GameConfig 覆蓋） */
const DEFAULTS: Record<RoomCode, {
  payouts: Record<BetSide, number>;
  minBet: number; maxBet: number;
  durationSeconds: number; lockBeforeRevealSec: number;
  enabled: boolean;
}> = {
  R30: { payouts: basePayouts(), minBet: 10, maxBet: 100000, durationSeconds: 30, lockBeforeRevealSec: 8,  enabled: true },
  R60: { payouts: basePayouts(), minBet: 10, maxBet: 100000, durationSeconds: 60, lockBeforeRevealSec: 10, enabled: true },
  R90: { payouts: basePayouts(), minBet: 10, maxBet: 100000, durationSeconds: 90, lockBeforeRevealSec: 15, enabled: true },
};
function basePayouts(): Record<BetSide, number> {
  return {
    PLAYER: 1, BANKER: 1, TIE: 8,
    PLAYER_PAIR: 11, BANKER_PAIR: 11,
    ANY_PAIR: 5, PERFECT_PAIR: 25,
    BANKER_SUPER_SIX: 12, // 可調
  } as any;
}
const KEY = (room: RoomCode) => `room.${room}`;

/** 取房設定（合併 DB 覆蓋預設） */
export async function getRoomConfig(room: RoomCode) {
  const d = DEFAULTS[room];
  const row = (await getBaccaratRoomConfig(KEY(room))) ?? {};
  return {
    payouts: { ...d.payouts, ...(row.payouts || {}) },
    minBet: row.minBet ?? d.minBet,
    maxBet: row.maxBet ?? d.maxBet,
    durationSeconds: row.durationSeconds ?? d.durationSeconds,
    lockBeforeRevealSec: row.lockBeforeRevealSec ?? d.lockBeforeRevealSec,
    enabled: row.enabled ?? d.enabled,
  };
}

export async function setRoomConfig(room: RoomCode, patch: Partial<Awaited<ReturnType<typeof getRoomConfig>>>) {
  const cur = await getRoomConfig(room);
  const merged = {
    ...cur,
    payouts: { ...cur.payouts, ...(patch.payouts || {}) },
    minBet: patch.minBet ?? cur.minBet,
    maxBet: patch.maxBet ?? cur.maxBet,
    durationSeconds: patch.durationSeconds ?? cur.durationSeconds,
    lockBeforeRevealSec: patch.lockBeforeRevealSec ?? cur.lockBeforeRevealSec,
    enabled: patch.enabled ?? cur.enabled,
  };
  await setBaccaratRoomConfig(KEY(room), merged);
  return merged;
}

/** 依時間計算當日 round 索引與封盤/揭牌時點 */
export function calcTiming(room: RoomCode, durationSeconds: number, lockBeforeRevealSec: number, now = new Date()) {
  const day = taipeiDayStartUTC(now);
  const since = Math.floor((now.getTime() - day.getTime()) / 1000);
  const roundSeq = Math.floor(since / durationSeconds);
  const startMs = day.getTime() + roundSeq * durationSeconds * 1000;
  const startedAt = new Date(startMs);
  const revealAt = new Date(startMs + durationSeconds * 1000);
  const lockAt = new Date(revealAt.getTime() - lockBeforeRevealSec * 1000);
  const locked = now >= lockAt;
  const shouldReveal = now >= revealAt;
  return { day, roundSeq, startedAt, lockAt, revealAt, locked, shouldReveal };
}

/** 以種子決定當局牌面與結果，可重現（無需存 DB） */
type Suit = "S"|"H"|"D"|"C";
type Card = { rank:number; suit:Suit };
const suits: Suit[] = ["S","H","D","C"];

function deck(seedStr: string): Card[] {
  const s = seeded(seedStr);
  const d: Card[] = [];
  for (const suit of suits) for (let r = 1; r <= 13; r++) d.push({ rank: r, suit });
  // Fisher-Yates with seeded rnd
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(s.next() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}
const val = (r:number)=> (r>=10?0:r);
const total = (cs:Card[]) => cs.reduce((a,c)=>a+val(c.rank),0)%10;
const pair = (a?:Card,b?:Card)=> !!(a&&b&&a.rank===b.rank);
const perfect = (a?:Card,b?:Card)=> !!(a&&b&&a.rank===b.rank&&a.suit===b.suit);

export function dealBySeed(seedStr: string){
  const d = deck(seedStr);
  const draw = () => d.pop()!;
  const p:[Card,Card,Card?]=[draw(),draw(),undefined], b:[Card,Card,Card?]=[draw(),draw(),undefined];
  const pt0=total(p.filter(Boolean) as Card[]), bt0=total(b.filter(Boolean) as Card[]);
  if(!(pt0>=8||bt0>=8)){
    if(pt0<=5) p[2]=draw();
    const p3=p[2]; const bt=total(b.filter(Boolean) as Card[]);
    if(!p3){ if(bt<=5) b[2]=draw(); }
    else{
      const v=val(p3.rank);
      if(bt<=2) b[2]=draw();
      else if(bt===3 && v!==8) b[2]=draw();
      else if(bt===4 && v>=2 && v<=7) b[2]=draw();
      else if(bt===5 && v>=4 && v<=7) b[2]=draw();
      else if(bt===6 && (v===6||v===7)) b[2]=draw();
    }
  }
  const pc = p.filter(Boolean) as Card[], bc=b.filter(Boolean) as Card[];
  const pt = total(pc), bt= total(bc);
  const outcome: RoundOutcome = pt>bt?"PLAYER":pt<bt?"BANKER":"TIE";
  const usedNoCommission = outcome==="BANKER" && bt===6;
  return {
    playerCards: pc, bankerCards: bc,
    playerTotal: pt, bankerTotal: bt,
    outcome, usedNoCommission,
    playerPair: pair(p[0],p[1]), bankerPair: pair(b[0],b[1]),
    anyPair: pair(p[0],p[1]) || pair(b[0],b[1]),
    perfectPair: perfect(p[0],p[1]) || perfect(b[0],b[1]),
  };
}

/** 建/取 當前回合（依 startedAt 視窗） */
export async function ensureCurrentRound(room: RoomCode, startedAt: Date) {
  const end = new Date(startedAt.getTime() + 1000 * 120); // 搜索視窗（兩分鐘緩衝）
  let r = await prisma.round.findFirst({ where: { room, startedAt: { gte: startedAt, lt: end } }, orderBy:{ startedAt:"asc" } });
  if (r) return r;
  return prisma.round.create({ data: { room, phase: "BETTING", startedAt } });
}

/** 下注派彩計算 */
export function calcPayout(side: BetSide, amt: number, outcome: RoundOutcome, flags: { playerPair:boolean; bankerPair:boolean; anyPair:boolean; perfectPair:boolean; super6:boolean }, payouts: Record<BetSide, number>) {
  if (side==="PLAYER") return outcome==="PLAYER" ? (amt + amt*payouts.PLAYER) : outcome==="TIE" ? amt : 0;
  if (side==="BANKER"){
    if (outcome==="BANKER"){
      // 超級六：可同時有兩種玩法：1) BANKER 一般 1:1 + 6點半賠、2) 獨立投注 BANKER_SUPER_SIX
      const bonus = flags.super6 ? Math.floor(amt*0.5) : amt*payouts.BANKER;
      return amt + bonus;
    }
    return outcome==="TIE" ? amt : 0;
  }
  if (side==="TIE") return outcome==="TIE" ? (amt + amt*payouts.TIE) : 0;
  if (side==="PLAYER_PAIR") return flags.playerPair ? (amt + amt*payouts.PLAYER_PAIR) : 0;
  if (side==="BANKER_PAIR") return flags.bankerPair ? (amt + amt*payouts.BANKER_PAIR) : 0;
  if (side==="ANY_PAIR") return flags.anyPair ? (amt + amt*payouts.ANY_PAIR) : 0;
  if (side==="PERFECT_PAIR") return flags.perfectPair ? (amt + amt*payouts.PERFECT_PAIR) : 0;
  if (side==="BANKER_SUPER_SIX") return flags.super6 ? (amt + amt*payouts.BANKER_SUPER_SIX) : 0;
  return 0;
}
