// services/baccarat.service.ts
import prisma from "@/lib/prisma";
import { getGameConfig, setGameConfig } from "@/lib/game-config";
import { taipeiDayStartUTC } from "@/lib/utils";
import type { BetSide, Room, RoomCode } from "@prisma/client";

export type Payouts = { PLAYER:number; BANKER:number; TIE:number; PLAYER_PAIR:number; BANKER_PAIR:number };
export type BaccaratRoomConfig = {
  payouts: Payouts;
  minBet: number;
  maxBet: number;
  durationSeconds: number;
  lockBeforeRevealSec: number;
};

const DEFAULTS: Record<RoomCode, BaccaratRoomConfig> = {
  R30:{ payouts:{PLAYER:1,BANKER:1,TIE:8,PLAYER_PAIR:11,BANKER_PAIR:11}, minBet:10,maxBet:100000,durationSeconds:30,lockBeforeRevealSec:8 },
  R60:{ payouts:{PLAYER:1,BANKER:1,TIE:8,PLAYER_PAIR:11,BANKER_PAIR:11}, minBet:10,maxBet:100000,durationSeconds:60,lockBeforeRevealSec:10 },
  R90:{ payouts:{PLAYER:1,BANKER:1,TIE:8,PLAYER_PAIR:11,BANKER_PAIR:11}, minBet:10,maxBet:100000,durationSeconds:90,lockBeforeRevealSec:15 },
};

const KEY = (room: RoomCode) => `baccarat.room.${room}`;

export async function getRoomConfig(room: RoomCode): Promise<BaccaratRoomConfig> {
  const row = await getGameConfig(KEY(room));
  if (!row) return DEFAULTS[room];
  const v = row as Partial<BaccaratRoomConfig>;
  const d = DEFAULTS[room];
  return {
    payouts: { ...d.payouts, ...(v.payouts ?? {}) },
    minBet: Number.isFinite(v.minBet) ? (v.minBet as number) : d.minBet,
    maxBet: Number.isFinite(v.maxBet) ? (v.maxBet as number) : d.maxBet,
    durationSeconds: Number.isFinite(v.durationSeconds) ? (v.durationSeconds as number) : d.durationSeconds,
    lockBeforeRevealSec: Number.isFinite(v.lockBeforeRevealSec) ? (v.lockBeforeRevealSec as number) : d.lockBeforeRevealSec,
  };
}

export async function setRoomConfig(room: RoomCode, cfg: Partial<BaccaratRoomConfig>) {
  const cur = await getRoomConfig(room);
  const merged: BaccaratRoomConfig = {
    payouts: { ...cur.payouts, ...(cfg.payouts ?? {}) },
    minBet: cfg.minBet ?? cur.minBet,
    maxBet: cfg.maxBet ?? cur.maxBet,
    durationSeconds: cfg.durationSeconds ?? cur.durationSeconds,
    lockBeforeRevealSec: cfg.lockBeforeRevealSec ?? cur.lockBeforeRevealSec,
  };
  await setGameConfig(KEY(room), merged);
  if (cfg.durationSeconds != null) {
    await prisma.room.update({ where: { code: room }, data: { durationSeconds: merged.durationSeconds } }).catch(()=>{});
  }
  return merged;
}

/** 確保房間存在 */
export async function ensureRoom(code: RoomCode): Promise<Room> {
  const r = await prisma.room.findUnique({ where: { code } });
  if (r) return r;
  const cfg = await getRoomConfig(code);
  return prisma.room.create({ data: { code, name: roomName(code), durationSeconds: cfg.durationSeconds, enabled: true } });
}
function roomName(c: RoomCode) { return c==="R30"?"快速 30 秒":c==="R60"?"標準 60 秒":"慢速 90 秒"; }

/** 計時：每日重置（台北 00:00），依時長算回合序並產生鎖單/揭牌點 */
export function calcTiming(code: RoomCode, durationSeconds: number, lockBeforeRevealSec: number, now = new Date()) {
  const day = taipeiDayStartUTC(now);
  const sinceSec = Math.floor((now.getTime() - day.getTime())/1000);
  const roundSeq = Math.floor(sinceSec/durationSeconds);
  const startMs = day.getTime() + roundSeq*durationSeconds*1000;
  const startedAt = new Date(startMs);
  const revealAt = new Date(startMs + durationSeconds*1000);
  const lockAt = new Date(revealAt.getTime() - lockBeforeRevealSec*1000);
  const locked = now >= lockAt;
  const shouldReveal = now >= revealAt;
  return { day, roundSeq, startedAt, revealAt, lockAt, locked, shouldReveal };
}

/** 發牌（內含補牌規則/對子/超級6） */
type Suit = "S"|"H"|"D"|"C"; type Card = { rank:number; suit:Suit };
function freshDeck(): Card[] { const d:Card[]=[]; (["S","H","D","C"] as Suit[]).forEach(s=>{ for(let r=1;r<=13;r++) d.push({rank:r,suit:s});}); return d; }
function shuffle<T>(a:T[]){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
const val=(r:number)=>r>=10?0:r, total=(cs:Card[])=>cs.reduce((a,c)=>a+val(c.rank),0)%10;
const pair=(a?:Card,b?:Card)=>!!(a&&b&&a.rank===b.rank);
const perfect=(a?:Card,b?:Card)=>!!(a&&b&&a.rank===b.rank&&a.suit===b.suit);

export function dealRound(){
  const deck=shuffle(freshDeck()); const draw=()=>deck.pop()!;
  const p:[Card,Card,Card?]=[draw(),draw(),undefined]; const b:[Card,Card,Card?]=[draw(),draw(),undefined];
  const pt0=total(p.filter(Boolean) as Card[]), bt0=total(b.filter(Boolean) as Card[]);
  if(!(pt0>=8||bt0>=8)){ if(pt0<=5) p[2]=draw();
    const p3=p[2]; const bt=total(b.filter(Boolean) as Card[]);
    if(!p3){ if(bt<=5) b[2]=draw(); } else {
      const v=val(p3.rank);
      if(bt<=2) b[2]=draw(); else if(bt===3 && v!==8) b[2]=draw();
      else if(bt===4 && v>=2 && v<=7) b[2]=draw();
      else if(bt===5 && v>=4 && v<=7) b[2]=draw();
      else if(bt===6 && (v===6||v===7)) b[2]=draw();
    }
  }
  const playerCards = p.filter(Boolean) as Card[], bankerCards=b.filter(Boolean) as Card[];
  const playerTotal = total(playerCards), bankerTotal= total(bankerCards);
  const outcome = playerTotal>bankerTotal?"PLAYER":playerTotal<bankerTotal?"BANKER":"TIE";
  return {
    playerCards, bankerCards, playerTotal, bankerTotal, outcome,
    playerPair: pair(p[0],p[1]), bankerPair: pair(b[0],b[1]),
    anyPair: pair(p[0],p[1])||pair(b[0],b[1]),
    perfectPair: perfect(p[0],p[1])||perfect(b[0],b[1]),
    usedNoCommission: outcome==="BANKER" && bankerTotal===6,
  };
}

/** 根據注單計算派彩（含和退本金、對子 11、超級6 半賠） */
export function payoutAmount(side: BetSide, amount:number, outcome:"PLAYER"|"BANKER"|"TIE", flags: { playerPair?:boolean; bankerPair?:boolean; usedNoCommission?:boolean }, payouts: Payouts){
  if(side==="PLAYER") {
    if(outcome==="PLAYER") return amount + amount*payouts.PLAYER;
    if(outcome==="TIE") return amount; return 0;
  }
  if(side==="BANKER") {
    if(outcome==="BANKER"){
      const bonus = flags.usedNoCommission ? Math.floor(amount*0.5) : amount*payouts.BANKER;
      return amount + bonus;
    }
    if(outcome==="TIE") return amount; return 0;
  }
  if(side==="TIE") return outcome==="TIE" ? amount + amount*payouts.TIE : 0;
  if(side==="PLAYER_PAIR") return flags.playerPair ? amount + amount*payouts.PLAYER_PAIR : 0;
  if(side==="BANKER_PAIR") return flags.bankerPair ? amount + amount*payouts.BANKER_PAIR : 0;
  return 0;
}
