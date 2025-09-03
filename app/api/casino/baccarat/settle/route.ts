export const runtime="nodejs"; export const dynamic="force-dynamic";

import prisma from "@/lib/prisma";
import { getRoomConfig, dealBySeed, calcPayout } from "@/services/baccarat.service";
import type { RoomCode } from "@prisma/client";

export async function POST(req: Request){
  const body = await req.json().catch(()=> ({})) as { room?:RoomCode; roundId?:string };
  const room = (body.room || "R60") as RoomCode;
  const cfg = await getRoomConfig(room);

  // 找最近一局已 SETTLED 但未派彩（以 Ledger 是否存在判斷）
  const last = await prisma.round.findFirst({
    where:{ room, phase:"SETTLED" }, orderBy:{ endedAt:"desc" }
  });
  if (!last) return Response.json({ ok:true, message:"no round" });

  const paid = await prisma.ledger.findFirst({ where:{ type:"PAYOUT", roundId: last.id }});
  if (paid) return Response.json({ ok:true, message:"already settled" });

  const d = dealBySeed(`${last.id}:${last.startedAt.toISOString()}`);
  const flags = { playerPair: d.playerPair, bankerPair: d.bankerPair, anyPair: d.anyPair, perfectPair: d.perfectPair, super6: d.usedNoCommission };

  const bets = await prisma.bet.findMany({ where:{ roundId: last.id }});
  const credit = new Map<string, number>();
  for (const b of bets) {
    const win = calcPayout(b.side as any, b.amount, d.outcome, flags, cfg.payouts);
    if (win>0) credit.set(b.userId, (credit.get(b.userId) ?? 0) + win);
  }

  // 交易：入帳 + Ledger（逐人單筆，備註 roundId）
  await prisma.$transaction(async tx=>{
    for (const [uid, amt] of credit) {
      await tx.user.update({ where:{ id: uid }, data:{ balance:{ increment: amt } }});
      await tx.ledger.create({ data:{ userId: uid, type:"PAYOUT", target:"WALLET", amount: amt, roundId: last.id, room }});
    }
  });

  const totalPaid = Array.from(credit.values()).reduce((a,b)=>a+b,0);
  return Response.json({ ok:true, totalPaid, super6Applied: flags.super6 });
}
