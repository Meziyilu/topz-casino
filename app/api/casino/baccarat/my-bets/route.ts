export const runtime="nodejs"; export const dynamic="force-dynamic";

import prisma from "@/lib/prisma";
import { verifyJWT } from "@/lib/auth";
import { getRoomConfig, calcTiming, ensureCurrentRound } from "@/services/baccarat.service";
import type { RoomCode } from "@prisma/client";

export async function GET(req: Request){
  const auth = await verifyJWT(req);
  if (!auth?.sub) return Response.json({ error:"UNAUTH" }, { status:401 });

  const { searchParams } = new URL(req.url);
  const room = (searchParams.get("room") as RoomCode) || "R60";
  const cfg = await getRoomConfig(room);
  const t = calcTiming(room, cfg.durationSeconds, cfg.lockBeforeRevealSec, new Date());
  const rnd = await ensureCurrentRound(room, t.startedAt);
  const items = await prisma.bet.findMany({ where:{ roundId: rnd.id, userId: auth.sub }, orderBy:{ createdAt:"asc" }});
  return Response.json({ items }, { headers:{ "Cache-Control":"no-store" }});
}
