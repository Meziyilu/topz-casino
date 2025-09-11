import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sicboHub } from "./sse";
import type { RoomKey, RoomState } from "./types";
import { defaultPayoutTable } from "./odds";

type Cfg = {
  drawIntervalSec: number;
  lockBeforeRollSec: number;
  limits: { minBet: number; maxBet: number; perTypeMax: number; perRoundMax: number };
  payout: any;
};
type RoomInternal = { state: RoomState; cfg: Cfg; timer: NodeJS.Timeout | null; };

function todayISO() {
  const now = new Date();
  const P = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${P(now.getMonth()+1)}-${P(now.getDate())}`;
}
function topic(room:RoomKey, t:string){ return `sicbo:${room}:${t}`; }
function roll(): [number,number,number]{
  return [1+Math.floor(Math.random()*6),1+Math.floor(Math.random()*6),1+Math.floor(Math.random()*6)];
}

const rooms: Map<RoomKey, RoomInternal> = (globalThis as any).__sicboRooms ??= new Map();

async function loadConfig(room: RoomKey): Promise<Cfg> {
  const c = await prisma.sicboConfig.findUnique({ where: { room } });
  if (!c) {
    return {
      drawIntervalSec: 60,
      lockBeforeRollSec: 10,
      limits: { minBet: 10, maxBet: 100000, perTypeMax: 500000, perRoundMax: 1000000 },
      payout: defaultPayoutTable
    };
  }
  return {
    drawIntervalSec: c.drawIntervalSec,
    lockBeforeRollSec: c.lockBeforeRollSec,
    limits: { minBet: c.minBet, maxBet: c.maxBet, perTypeMax: c.perTypeMax, perRoundMax: c.perRoundMax },
    payout: c.payoutTable ?? defaultPayoutTable
  };
}

async function nextDaySeq(room: RoomKey, day: string) {
  const last = await prisma.sicboRound.findFirst({
    where: { room, day: new Date(`${day}T00:00:00.000Z`) },
    orderBy: { daySeq: "desc" },
    select: { daySeq: true }
  });
  return (last?.daySeq ?? 0) + 1;
}

function publish(room:RoomKey, r:RoomInternal){
  sicboHub.emit(topic(room,"state"), { state: r.state });
  sicboHub.emit(topic(room,"tick"), { serverTime: new Date().toISOString(), state: r.state });
}

async function createRound(room: RoomKey, r: RoomInternal) {
  const day = todayISO();
  const daySeq = await nextDaySeq(room, day);
  const startsAt = new Date();
  const locksAt  = new Date(startsAt.getTime() + (r.cfg.drawIntervalSec - r.cfg.lockBeforeRollSec) * 1000);

  const serverSeed = crypto.randomBytes(16).toString("hex");
  const seedHash   = crypto.createHash("sha256").update(`${serverSeed}:${room}:${day}:${daySeq}`).digest("hex");

  const round = await prisma.sicboRound.create({
    data: {
      room,
      day: new Date(`${day}T00:00:00.000Z`),
      daySeq,
      phase: "BETTING",
      startsAt,
      locksAt,
      die1: 0, die2: 0, die3: 0,
      sum: 0,
      isTriple: false,
      serverSeed,
      seedHash
    }
  });

  r.state = {
    room, roundId: round.id, day, daySeq, phase: "BETTING",
    startsAt: startsAt.toISOString(),
    locksAt: locksAt.toISOString(),
    settledAt: null,
    exposure: {}
  };
  publish(room, r);
}

async function lockRound(room: RoomKey, r: RoomInternal) {
  if (!r.state.roundId) return;
  r.state.phase = "LOCKED";
  await prisma.sicboRound.update({ where: { id: r.state.roundId }, data: { phase: "LOCKED" }});
  publish(room, r);
}

async function settleRound(room: RoomKey, r: RoomInternal) {
  if (!r.state.roundId) return;

  const [d1,d2,d3] = roll();
  const sum = d1 + d2 + d3;
  const isTriple = (d1===d2 && d2===d3);

  await prisma.sicboRound.update({
    where: { id: r.state.roundId },
    data: { phase:"SETTLED", die1:d1, die2:d2, die3:d3, sum, isTriple, settledAt: new Date() }
  });

  const bets = await prisma.sicboBet.findMany({ where: { roundId: r.state.roundId, status: "PLACED" }});
  const txs: any[] = [];

  for (const b of bets) {
    const amount = b.amount;
    let win = 0;
    const oddsTable = r.cfg.payout;

    if (b.kind==="BIG_SMALL" && b.bigSmall) {
      const big = sum>=11 && sum<=17, small = sum>=4 && sum<=10;
      const tripleKills = oddsTable.bigSmall?.tripleKills ?? true;
      if (!isTriple && ((b.bigSmall==="BIG" && big) || (b.bigSmall==="SMALL" && small))) {
        win = Math.floor(amount * Number(oddsTable.bigSmall[b.bigSmall]));
      } else if (isTriple && !tripleKills) {
        win = 0;
      }
    }
    else if (b.kind==="TOTAL" && b.totalSum!=null) {
      const odd = Number(oddsTable.total?.[b.totalSum] ?? 0);
      if (sum === b.totalSum) win = Math.floor(amount * odd);
    }
    else if (b.kind==="SINGLE_FACE" && b.face!=null) {
      const c = [d1,d2,d3].filter(v=>v===b.face).length;
      if (c>0) win = amount * ({1:1,2:2,3:3} as any)[c];
    }
    else if (b.kind==="DOUBLE_FACE" && b.face!=null) {
      const c = [d1,d2,d3].filter(v=>v===b.face).length;
      if (c>=2) win = Math.floor(amount * Number(oddsTable.doubleFace ?? 8));
    }
    else if (b.kind==="ANY_TRIPLE") {
      if (isTriple) win = Math.floor(amount * Number(oddsTable.anyTriple ?? 24));
    }
    else if (b.kind==="SPECIFIC_TRIPLE" && b.face!=null) {
      if (isTriple && d1===b.face) win = Math.floor(amount * Number(oddsTable.specificTriple ?? 150));
    }
    else if (b.kind==="TWO_DICE_COMBO" && b.faceA!=null && b.faceB!=null) {
      const faces = [d1,d2,d3].sort();
      const has = new Set([`${faces[0]}_${faces[1]}`,`${faces[0]}_${faces[2]}`,`${faces[1]}_${faces[2]}`]);
      const key = `${Math.min(b.faceA,b.faceB)}_${Math.max(b.faceA,b.faceB)}`;
      if (has.has(key)) win = Math.floor(amount * Number(oddsTable.twoDiceCombo ?? 5));
    }

    if (win > 0) {
      txs.push(prisma.ledger.create({ data: { type:"PAYOUT", game:"SICBO", gameRef: b.id, amount: win, userId: b.userId }}));
      txs.push(prisma.user.update({ where:{ id:b.userId }, data:{ balance: { increment: win }}}));
    }
    txs.push(prisma.sicboBet.update({ where:{ id:b.id }, data:{ payout: win, status:"SETTLED", settledAt: new Date() }}));
  }
  if (txs.length) await prisma.$transaction(txs);

  r.state.phase = "SETTLED";
  r.state.dice = [d1,d2,d3];
  r.state.sum = sum;
  r.state.isTriple = isTriple;
  r.state.settledAt = new Date().toISOString();

  sicboHub.emit(topic(room,"result"), { dice:[d1,d2,d3], sum, isTriple, roundId: r.state.roundId });
  publish(room, r);
}

async function refreshExposure(room:RoomKey, r:RoomInternal){
  if (!r.state.roundId) return;
  const bets = await prisma.sicboBet.findMany({ where:{ roundId:r.state.roundId, status:"PLACED" }});
  const exp: Record<string,number> = {};
  const add = (k:string, v:number)=> exp[k]=(exp[k]??0)+v;

  for (const b of bets){
    if (b.kind==="BIG_SMALL" && b.bigSmall) add(b.bigSmall, b.amount);
    else if (b.kind==="TOTAL" && b.totalSum!=null) add(`TOTAL_${b.totalSum}`, b.amount);
    else if (b.kind==="SINGLE_FACE" && b.face!=null) add(`FACE_${b.face}`, b.amount);
    else if (b.kind==="DOUBLE_FACE" && b.face!=null) add(`DBL_${b.face}`, b.amount);
    else if (b.kind==="ANY_TRIPLE") add(`TRIPLE_ANY`, b.amount);
    else if (b.kind==="SPECIFIC_TRIPLE" && b.face!=null) add(`TRIPLE_${b.face}${b.face}${b.face}`, b.amount);
    else if (b.kind==="TWO_DICE_COMBO" && b.faceA!=null && b.faceB!=null) add(`COMBO_${Math.min(b.faceA,b.faceB)}_${Math.max(b.faceA,b.faceB)}`, b.amount);
  }
  r.state.exposure = exp;
  sicboHub.emit(topic(room,"exposure"), exp);
}

async function tick(room:RoomKey, r:RoomInternal){
  const now = new Date();
  if (!r.state.roundId || (new Date(r.state.startsAt).getTime() + r.cfg.drawIntervalSec*1000 <= now.getTime())) {
    await createRound(room, r);
  }
  if (r.state.phase==="BETTING" && now >= new Date(r.state.locksAt)) {
    await lockRound(room, r);
  }
  const endAt = new Date(new Date(r.state.startsAt).getTime() + r.cfg.drawIntervalSec*1000 - 30);
  if (r.state.phase!=="SETTLED" && now >= endAt) {
    await settleRound(room, r);
  }
  await refreshExposure(room, r);
  publish(room, r);
}

function loop(room:RoomKey, r:RoomInternal){
  clearTimeout(r.timer!);
  r.timer = setTimeout(async ()=>{
    try { await tick(room, r); } catch { /* swallow */ }
    finally { loop(room, r); }
  }, 1000);
}

export async function ensureRooms(){
  for (const room of ["R30","R60","R90"] as RoomKey[]) {
    if (!rooms.has(room)) {
      const cfg = await loadConfig(room);
      const now = new Date();
      const state: RoomState = {
        room, roundId: null, day: todayISO(), daySeq: 0,
        phase: "BETTING",
        startsAt: now.toISOString(),
        locksAt: new Date(now.getTime() + (cfg.drawIntervalSec - cfg.lockBeforeRollSec)*1000).toISOString(),
        settledAt: null,
        exposure: {}
      };
      const r: RoomInternal = { state, cfg, timer: null };
      rooms.set(room, r);
      await createRound(room, r);
      loop(room, r);
    }
  }
  return rooms;
}

export function subscribeRoom(room:RoomKey, channel:string, handler:(data:any)=>void){
  return sicboHub.subscribe(`sicbo:${room}:${channel}`, handler);
}

export function getRoomState(room:RoomKey){ return rooms.get(room)?.state ?? null; }
export function getRoomConfig(room:RoomKey){ return rooms.get(room)?.cfg ?? null; }
