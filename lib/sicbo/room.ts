import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { sicboHub } from "./sse";
import { RoomState } from "./types";

type RoomKey = "R30"|"R60"|"R90";
type Cfg = { drawIntervalSec:number; lockBeforeRollSec:number; limits:{minBet:number;maxBet:number;perTypeMax:number;perRoundMax:number}; payout:any; };

type RoomInternal = { state: RoomState; cfg: Cfg; timer: NodeJS.Timeout | null; };

function todayISO(){
  const now = new Date();
  const P=(n:number)=>String(n).padStart(2,"0");
  return `${now.getFullYear()}-${P(now.getMonth()+1)}-${P(now.getDate())}`;
}

async function loadConfig(room:RoomKey): Promise<Cfg>{
  const c = await prisma.sicboConfig.findUniqueOrThrow({ where:{ room } });
  return {
    drawIntervalSec: c.drawIntervalSec,
    lockBeforeRollSec: c.lockBeforeRollSec,
    limits: { minBet:c.minBet, maxBet:c.maxBet, perTypeMax:c.perTypeMax, perRoundMax:c.perRoundMax },
    payout: c.payoutTable
  };
}

async function nextDaySeq(room:RoomKey, day:string){
  const last = await prisma.sicboRound.findFirst({
    where: { room, day: new Date(day+"T00:00:00.000Z") },
    orderBy: { daySeq: "desc" },
    select: { daySeq: true }
  });
  return (last?.daySeq ?? 0) + 1;
}

function roll(): [number,number,number]{
  return [1+Math.floor(Math.random()*6),1+Math.floor(Math.random()*6),1+Math.floor(Math.random()*6)];
}

function topic(room:RoomKey, t:string){ return `sicbo:${room}:${t}`; }

const rooms: Map<RoomKey, RoomInternal> = (globalThis as any).__sicboRooms ??= new Map();

// createRound / lockRound / settleRound / refreshExposure / tick ... 省略重複，邏輯如前面設計

export async function ensureRooms(){
  for (const room of ["R30","R60","R90"] as RoomKey[]) {
    if (!rooms.has(room)) {
      const cfg = await loadConfig(room);
      const state: RoomState = {
        room, roundId:null, day:todayISO(), daySeq:0,
        phase:"BETTING", startsAt:new Date().toISOString(),
        locksAt:new Date().toISOString(), settledAt:null, exposure:{}
      };
      const r: RoomInternal = { state, cfg, timer:null };
      rooms.set(room,r);
      // 啟動循環
    }
  }
  return rooms;
}

export function subscribeRoom(room:RoomKey, channel:string, handler:(d:any)=>void){
  return sicboHub.subscribe(`sicbo:${room}:${channel}`, handler);
}

export function getRoomState(room:RoomKey){ return rooms.get(room)?.state ?? null; }
export function getRoomConfig(room:RoomKey){ return rooms.get(room)?.cfg ?? null; }
