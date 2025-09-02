export const runtime="nodejs"; export const dynamic="force-dynamic";

import prisma from "@/lib/prisma";
import { verifyJWT } from "@/lib/auth";
import { ensureRoom, getRoomConfig, calcTiming } from "@/services/baccarat.service";
import type { RoomCode } from "@prisma/client";

export async function GET(req: Request){
  const auth = await verifyJWT(req);
  if (!auth?.sub) return Response.json({ error:"UNAUTH" }, { status:401 });

  const { searchParams } = new URL(req.url);
  const code = (searchParams.get("room") as RoomCode) || "R60";
  const room = await ensureRoom(code);
  const cfg = await getRoomConfig(code);
  const t = calcTiming(code, cfg.durationSeconds, cfg.lockBeforeRevealSec, new Date());
  const round = await prisma.round.findFirst({ where:{ roomId: room.id, day: t.day, roundSeq: t.roundSeq }});
  if (!round) return Response.json({ items:[] });
  const items = await prisma.bet.findMany({ where:{ roundId: round.id, userId: auth.sub }, orderBy:{ createdAt:"asc" }});
  return Response.json({ items }, { headers:{ "Cache-Control":"no-store" }});
}
