export const runtime="nodejs"; export const dynamic="force-dynamic";

import prisma from "@/lib/prisma";
import { dealBySeed } from "@/services/baccarat.service";
import type { RoomCode } from "@prisma/client";

export async function GET(req: Request){
  const { searchParams } = new URL(req.url);
  const room = (searchParams.get("room") as RoomCode) || "R60";
  const rounds = await prisma.round.findMany({
    where:{ room, phase:"SETTLED" },
    orderBy:{ endedAt:"desc" }, take:10,
    select:{ id:true, startedAt:true, endedAt:true }
  });
  const items = rounds.map(r => {
    const d = dealBySeed(`${r.id}:${r.startedAt.toISOString()}`);
    return {
      outcome: d.outcome,
      playerPair: d.playerPair, bankerPair: d.bankerPair,
      usedNoCommission: d.usedNoCommission,
      playerTotal: d.playerTotal, bankerTotal: d.bankerTotal,
      settledAt: r.endedAt
    };
  });
  return Response.json({ items }, { headers:{ "Cache-Control":"no-store" }});
}
