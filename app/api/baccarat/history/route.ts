export const runtime="nodejs"; export const dynamic="force-dynamic";

import prisma from "@/lib/prisma";
import { ensureRoom } from "@/services/baccarat.service";
import type { RoomCode } from "@prisma/client";

export async function GET(req: Request){
  const { searchParams } = new URL(req.url);
  const code = (searchParams.get("room") as RoomCode) || "R60";
  const room = await ensureRoom(code);

  const items = await prisma.round.findMany({
    where:{ roomId: room.id, phase:"SETTLED" },
    orderBy:[{day:"desc"}, {roundSeq:"desc"}],
    take:10,
    select:{
      day:true, roundSeq:true, outcome:true,
      playerTotal:true, bankerTotal:true,
      playerPair:true, bankerPair:true,
      usedNoCommission:true, settledAt:true
    }
  });
  return Response.json({ items }, { headers:{ "Cache-Control":"no-store" }});
}
