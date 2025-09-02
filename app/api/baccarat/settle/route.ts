export const runtime="nodejs"; export const dynamic="force-dynamic";

import prisma from "@/lib/prisma";
import { ensureRoom, getRoomConfig, payoutAmount } from "@/services/baccarat.service";
import type { RoomCode } from "@prisma/client";

export async function POST(req: Request){
  const body = await req.json().catch(()=> ({})) as { room?:RoomCode; day?:string; roundSeq?:number };
  const code = (body.room || "R60") as RoomCode;
  const room = await ensureRoom(code);
  const cfg = await getRoomConfig(code);

  const round = body.day && Number.isInteger(body.roundSeq)
    ? await prisma.round.findFirst({ where:{ roomId: room.id, day: new Date(body.day), roundSeq: body.roundSeq!, phase:"SETTLED", payoutSettled:false }})
    : await prisma.round.findFirst({ where:{ roomId: room.id, phase:"SETTLED", payoutSettled:false }, orderBy:[{day:"desc"},{roundSeq:"desc"}]});

  if (!round) return Response.json({ ok:true, message:"no round to settle" });

  const flags = { playerPair: !!round.playerPair, bankerPair: !!round.bankerPair, usedNoCommission: !!round.usedNoCommission };
  const bets = await prisma.bet.findMany({ where:{ roundId: round.id }, select:{ userId:true, side:true, amount:true }});

  const credit = new Map<string, number>();
  for (const b of bets) {
    const c = payoutAmount(b.side as any, b.amount, round.outcome!, flags, cfg.payouts);
    if (c>0) credit.set(b.userId, (credit.get(b.userId) ?? 0) + c);
  }

  try {
    await prisma.$transaction(async tx=>{
      for (const [uid, amt] of credit) {
        await tx.user.update({ where:{ id: uid }, data:{ balance:{ increment: amt } }});
        await tx.ledger.create({
          data:{ userId: uid, type:"PAYOUT", target:"WALLET", delta: amt, amount: amt,
                 memo:`Baccarat ${code} ${round.day.toISOString().slice(0,10)}#${round.roundSeq} payout` }
        });
      }
      await tx.round.update({ where:{ id: round.id }, data:{ payoutSettled:true }});
    });
  } catch {
    return Response.json({ error:"SETTLE_FAILED" }, { status:500 });
  }

  const totalPaid = Array.from(credit.values()).reduce((a,b)=>a+b,0);
  return Response.json({ ok:true, totalPaid, super6Applied: !!round.usedNoCommission });
}
