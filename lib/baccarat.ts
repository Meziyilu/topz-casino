export type RoomCode = "R30" | "R60" | "R90";
export type RoundPhase = "BETTING" | "REVEALING" | "SETTLED";
export type BetSide =
  | "PLAYER" | "BANKER" | "TIE"
  | "PLAYER_PAIR" | "BANKER_PAIR"
  | "ANY_PAIR" | "PERFECT_PAIR"
  | "BANKER_SUPER_SIX";

export const ODDS: Record<BetSide, number> = {
  PLAYER: 1,           // 1:1
  BANKER: 0.95,        // 1:0.95 (抽5%佣)
  TIE: 8,              // 1:8
  PLAYER_PAIR: 11,     // 1:11
  BANKER_PAIR: 11,     // 1:11
  ANY_PAIR: 5,         // 1:5
  PERFECT_PAIR: 25,    // 1:25
  BANKER_SUPER_SIX: 12 // 1:12（莊以6點勝）
};

export function taipeiDay(date = new Date()) {
  // 取台北當地日期字串 YYYY-MM-DD
  const tz = "Asia/Taipei";
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year:"numeric", month:"2-digit", day:"2-digit" });
  return fmt.format(date);
}

export function nextPhases(now: Date, startedAt: Date) {
  // 30s 下注 -> 8s 開獎動畫
  const betMs = 30_000;
  const revealMs = 8_000;
  const el = now.getTime() - startedAt.getTime();
  if (el < betMs) return { phase: "BETTING" as RoundPhase, lockInSec: Math.ceil((betMs - el)/1000), endInSec: Math.ceil((betMs + revealMs - el)/1000), locked:false };
  if (el < betMs + revealMs) return { phase: "REVEALING" as RoundPhase, lockInSec:0, endInSec: Math.ceil((betMs + revealMs - el)/1000), locked:true };
  return { phase: "SETTLED" as RoundPhase, lockInSec:0, endInSec:0, locked:true };
}

// ---- 百家樂發牌 + 補牌（標準規則） ----
type Card = { v: number }; // 2..9 = 面值；10/J/Q/K = 0；A = 1
function draw(deck: number[]) { return { v: deck.pop()! }; }
function points(a:number,b:number,c?:number){ return ((a+b+(c??0))%10); }
function isPair(a:number,b:number){ return a===b && a!==10; }

export type DealResult = {
  shoe: number[]; // 剩餘
  cards: {
    player: number[];
    banker: number[];
    playerThird?: number|null;
    bankerThird?: number|null;
  };
  total: { player:number; banker:number };
  outcome: "PLAYER"|"BANKER"|"TIE";
  bankerWinWith6: boolean;
  pairs: { playerPair:boolean; bankerPair:boolean; anyPair:boolean; perfectPair:boolean };
};

export function initShoe(seed = Date.now()) {
  // 8 副牌，洗牌（簡易 Fisher–Yates with seed）
  const raw:number[] = [];
  const ranks = [1,2,3,4,5,6,7,8,9,10,10,10,10]; // A=1, 10/J/Q/K=0
  for (let d=0; d<8; d++) for (let r of ranks) for (let s=0; s<4; s++) raw.push(r);
  let i = raw.length, rnd = lcg(seed);
  while (i>1){ const j = Math.floor(rnd()*i--); [raw[i], raw[j]] = [raw[j], raw[i]]; }
  return raw;
}
function lcg(seed:number){ let s = seed>>>0; return ()=> (s = (s*1664525+1013904223)>>>0, (s/0xFFFFFFFF)); }

export function dealRound(shoe:number[]): DealResult {
  const s = [...shoe];
  const p1 = draw(s).v, b1 = draw(s).v, p2 = draw(s).v, b2 = draw(s).v;
  let pThird: number|null = null;
  let bThird: number|null = null;

  let p = points(p1,p2);
  let b = points(b1,b2);

  // Natural 停牌
  if (!(p>=8 || b>=8)) {
    // 玩家補牌規則
    if (p<=5) { pThird = draw(s).v; p = points(p1,p2,pThird); }
    // 莊家補牌規則（依玩家第三張）
    if (pThird===null) {
      if (b<=5) { bThird = draw(s).v; b = points(b1,b2,bThird); }
    } else {
      // 表格規則
      if (b<=2) { bThird = draw(s).v; b = points(b1,b2,bThird); }
      else if (b===3 && pThird!==8) { bThird = draw(s).v; b = points(b1,b2,bThird); }
      else if (b===4 && [2,3,4,5,6,7].includes(pThird)) { bThird = draw(s).v; b = points(b1,b2,bThird); }
      else if (b===5 && [4,5,6,7].includes(pThird)) { bThird = draw(s).v; b = points(b1,b2,bThird); }
      else if (b===6 && [6,7].includes(pThird)) { bThird = draw(s).v; b = points(b1,b2,bThird); }
    }
  }

  const outcome = p===b ? "TIE" : (p>b ? "PLAYER" : "BANKER");
  const bankerWinWith6 = (outcome==="BANKER" && ((b)%10)===6);
  const pp = isPair(p1,p2), bp = isPair(b1,b2);
  const anyPair = pp || bp;
  const perfectPair = pp && bp && (p1===b1 && p2===b2); // 兩邊同點同牌面（簡化）
  return {
    shoe:s,
    cards:{ player:[p1,p2], banker:[b1,b2], playerThird:pThird??undefined, bankerThird:bThird??undefined },
    total:{ player:p, banker:b },
    outcome,
    bankerWinWith6,
    pairs:{ playerPair:pp, bankerPair:bp, anyPair, perfectPair }
  };
}

export function settleOne(bet:{side:BetSide; amount:number}, r:DealResult){
  const a = bet.amount;
  switch (bet.side){
    case "PLAYER": return r.outcome==="PLAYER" ? a + a*ODDS.PLAYER : (r.outcome==="TIE" ? a : 0);
    case "BANKER": return r.outcome==="BANKER" ? a + a*ODDS.BANKER : (r.outcome==="TIE" ? a : 0);
    case "TIE":    return r.outcome==="TIE"    ? a + a*ODDS.TIE    : 0;
    case "PLAYER_PAIR": return r.pairs.playerPair ? a + a*ODDS.PLAYER_PAIR : 0;
    case "BANKER_PAIR": return r.pairs.bankerPair ? a + a*ODDS.BANKER_PAIR : 0;
    case "ANY_PAIR":    return r.pairs.anyPair    ? a + a*ODDS.ANY_PAIR    : 0;
    case "PERFECT_PAIR":return r.pairs.perfectPair? a + a*ODDS.PERFECT_PAIR: 0;
    case "BANKER_SUPER_SIX": return r.bankerWinWith6 ? a + a*ODDS.BANKER_SUPER_SIX : 0;
  }
}

export type BigRoadNode = "B"|"P"|"T";
export function toBigRoad(history: ("BANKER"|"PLAYER"|"TIE")[]): BigRoadNode[] {
  return history.map(v => v==="BANKER"?"B":v==="PLAYER"?"P":"T");
}
