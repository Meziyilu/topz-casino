import { prisma } from "@/lib/prisma";
import { DealResult, RoomCode, nextPhases, initShoe, dealRound, settleOne, taipeiDay, BetSide } from "@/lib/baccarat";
import { addSeconds } from "date-fns";

type State = {
  room: RoomCode;
  round: { id:string; seq:number; phase:"BETTING"|"REVEALING"|"SETTLED"; startedAt:string; endsAt:string };
  timers: { lockInSec:number; endInSec:number };
  locked: boolean;
  table: { banker: number[]; player: number[]; bankerThird?:number; playerThird?:number; total?:{player:number;banker:number}; outcome?:string };
  bead: ("BANKER"|"PLAYER"|"TIE")[];
};

const ROOM_LIST: RoomCode[] = ["R30","R60","R90"]; // 三房，同設定
const REVEAL_SEC = 8;
const BET_SEC = 30;

export async function ensureRoomSeed(room: RoomCode){
  const meta = await prisma.gameConfig.findUnique({ where:{ gameCode_key: { gameCode:"BACCARAT", key:`room:${room}:shoeSeed` } }});
  if (!meta) {
    await prisma.gameConfig.create({ data:{ gameCode:"BACCARAT", key:`room:${room}:shoeSeed`, valueInt: Date.now() }});
  }
}

export async function currentState(room: RoomCode): Promise<State> {
  await ensureRoomSeed(room);
  let r = await prisma.baccaratRound.findFirst({ where:{ room }, orderBy:[{ createdAt:"desc" }]});

  const now = new Date();
  if (!r || r.phase==="SETTLED") {
    // 開新局
    const day = taipeiDay(now);
    const seq = (await prisma.baccaratRound.count({ where:{ room, day }})) + 1;
    const seed = (await prisma.gameConfig.findUnique({ where:{ gameCode_key:{ gameCode:"BACCARAT", key:`room:${room}:shoeSeed` }}}))!;
    const shoe = initShoe(seed.valueInt ?? Date.now());
    r = await prisma.baccaratRound.create({
      data:{
        room, day, seq,
        phase:"BETTING",
        startedAt: now,
        endsAt: addSeconds(now, BET_SEC + REVEAL_SEC),
        shoeJson: JSON.stringify(shoe),
      }
    });
  }

  // 狀態推進（從 startedAt 計算）
  const phaseInfo = nextPhases(now, new Date(r.startedAt));
  if (phaseInfo.phase==="REVEALING" && r.phase==="BETTING") {
    // 轉入 REVEALING -> 發牌結果保存
    const shoe = JSON.parse(r.shoeJson) as number[];
    const dealt = dealRound(shoe);
    await prisma.baccaratRound.update({
      where:{ id:r.id },
      data:{
        phase:"REVEALING",
        endsAt: addSeconds(new Date(r.startedAt), BET_SEC + REVEAL_SEC),
        resultJson: JSON.stringify(dealt),
        shoeJson: JSON.stringify(dealt.shoe),
      }
    });
    r = await prisma.baccaratRound.findUnique({ where:{ id:r.id }})!;
  }
  if (phaseInfo.phase==="SETTLED" && r.phase!=="SETTLED") {
    await settleRound(r.id);
    r = await prisma.baccaratRound.update({ where:{ id:r.id }, data:{ phase:"SETTLED" }});
  }

  const result = r.resultJson ? (JSON.parse(r.resultJson) as DealResult) : null;
  const bead = await prisma.baccaratRound.findMany({
    where:{ room, resultJson:{ not:null }}, orderBy:[{ createdAt:"desc" }], take: 60
  });
  const beadList = bead.reverse().map(x=>{
    const d = JSON.parse(x.resultJson!) as DealResult;
    return d.outcome as ("BANKER"|"PLAYER"|"TIE");
  });

  return {
    room,
    round: {
      id: r.id,
      seq: r.seq,
      phase: (r.phase as any),
      startedAt: r.startedAt.toISOString(),
      endsAt: r.endsAt.toISOString()
    },
    timers: { lockInSec: Math.max(0, nextPhases(new Date(), new Date(r.startedAt)).lockInSec), endInSec: Math.max(0, nextPhases(new Date(), new Date(r.startedAt)).endInSec) },
    locked: nextPhases(new Date(), new Date(r.startedAt)).locked,
    table: result ? {
      banker: result.cards.banker,
      player: result.cards.player,
      bankerThird: result.cards.bankerThird ?? undefined,
      playerThird: result.cards.playerThird ?? undefined,
      total: result.total,
      outcome: result.outcome
    } : { banker:[], player:[] },
    bead: beadList
  };
}

export async function placeBet(userId: string, room: RoomCode, roundId: string, side: BetSide, amount: number) {
  const round = await prisma.baccaratRound.findUnique({ where:{ id:roundId }});
  if (!round) throw new Error("ROUND_NOT_FOUND");
  const phase = nextPhases(new Date(), new Date(round.startedAt));
  if (phase.locked) throw new Error("BET_LOCKED");
  if (amount<=0) throw new Error("INVALID_AMOUNT");

  // 扣錢 + 建注 + Ledger
  await prisma.$transaction(async tx => {
    const u = await tx.user.findUnique({ where:{ id:userId }, select:{ balance:true }});
    if (!u || u.balance < amount) throw new Error("INSUFFICIENT_BALANCE");

    await tx.user.update({ where:{ id:userId }, data:{ balance: { decrement: amount }}});
    await tx.baccaratBet.create({ data:{ userId, room, roundId, side, amount }});
    await tx.ledger.create({ data:{ type:"BET_PLACED", amount, userId, room, roundId }});
  });
}

export async function settleRound(roundId:string){
  const r = await prisma.baccaratRound.findUnique({ where:{ id:roundId }});
  if (!r || !r.resultJson) return;
  const result = JSON.parse(r.resultJson) as DealResult;
  const bets = await prisma.baccaratBet.findMany({ where:{ roundId }});
  await prisma.$transaction(async tx=>{
    for (const b of bets){
      const payout = settleOne({ side:b.side as any, amount:b.amount }, result) ?? 0;
      if (payout>0){
        await tx.user.update({ where:{ id:b.userId }, data:{ balance:{ increment: payout }}});
        await tx.ledger.create({ data:{ type:"PAYOUT", amount:payout, userId:b.userId, room:b.room, roundId }});
      }
    }
  });
}
