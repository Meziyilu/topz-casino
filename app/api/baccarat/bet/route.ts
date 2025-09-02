export const runtime="nodejs"; export const dynamic="force-dynamic";

import prisma from "@/lib/prisma";
import { verifyJWT } from "@/lib/auth";
import { ensureRoom, getRoomConfig, calcTiming } from "@/services/baccarat.service";
import type { BetSide, RoomCode } from "@prisma/client";

const ALLOWED: BetSide[] = ["PLAYER","BANKER","TIE","PLAYER_PAIR","BANKER_PAIR"];

export async function POST(req: Request) {
  const auth = await verifyJWT(req);
  if (!auth?.sub) return Response.json({ error:"UNAUTH" }, { status:401 });

  const body = await req.json().catch(()=>null) as { room?:RoomCode; roomCode?:RoomCode; side?:BetSide; amount?:number };
  const code = (body?.room || body?.roomCode || "R60") as RoomCode;
  const side = body?.side as BetSide; const amount = Number(body?.amount ?? 0);
  if (!ALLOWED.includes(side) || !Number.isInteger(amount) || amount<=0) return Response.json({ error:"BAD_REQUEST" }, { status:400 });

  const room = await ensureRoom(code);
  const cfg = await getRoomConfig(code);
  if (!room.enabled) return Response.json({ error:"ROOM_CLOSED" }, { status:423 });
  if (amount<cfg.minBet || amount>cfg.maxBet) return Response.json({ error:"BET_OUT_OF_RANGE", min:cfg.minBet, max:cfg.maxBet }, { status:400 });

  const now = new Date();
  const t = calcTiming(code, cfg.durationSeconds, cfg.lockBeforeRevealSec, now);
  if (now >= t.lockAt) return Response.json({ error:"LOCKED" }, { status:423 });

  let round = await prisma.round.findFirst({ where: { roomId: room.id, day: t.day, roundSeq: t.roundSeq } });
  if (!round) round = await prisma.round.create({ data:{ roomId: room.id, day: t.day, roundSeq: t.roundSeq, phase:"BETTING", startedAt: t.startedAt } });
  if (round.phase!=="BETTING") return Response.json({ error:"LOCKED" }, { status:423 });

  try {
    await prisma.$transaction(async (tx)=>{
      const me = await tx.user.findUnique({ where:{ id: auth.sub }, select:{ balance:true }});
      if (!me || me.balance<amount) throw new Error("INSUFFICIENT_FUNDS");
      await tx.user.update({ where:{ id: auth.sub }, data:{ balance:{ decrement: amount } }});
      await tx.ledger.create({
        data:{
          userId: auth.sub, type:"BET_PLACED", target:"WALLET",
          delta: -amount, amount, memo: `Baccarat ${code} ${t.day.toISOString().slice(0,10)}#${t.roundSeq} ${side}`
        }
      });
      await tx.bet.create({ data:{ userId: auth.sub, roomId: room.id, roundId: round!.id, side, amount }});
    });
  } catch (e:any) {
    if (String(e?.message)==="INSUFFICIENT_FUNDS") return Response.json({ error:"INSUFFICIENT_FUNDS" }, { status:402 });
    return Response.json({ error:"BET_FAILED" }, { status:500 });
  }

  return Response.json({ ok:true }, { headers:{ "Cache-Control":"no-store" }});
}
