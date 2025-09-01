// app/api/casino/baccarat/my-bets/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import prisma from "@/lib/prisma";
import { verifyJWT } from "@/lib/jwt";
import { calcTiming } from "@/lib/gameclock";
import { noStoreJson } from "@/lib/http";

type Room = "R30" | "R60" | "R90";

export async function GET(req: Request) {
  const auth = verifyJWT(req);
  if (!auth?.sub) return noStoreJson({ error: "UNAUTHORIZED" }, 401);

  const { searchParams } = new URL(req.url);
  const room = (searchParams.get("room") as Room) || "R60";
  const { roundNo } = calcTiming(room, new Date());

  const round = await prisma.baccaratRound.findFirst({ where: { room, roundNo } });
  if (!round) return noStoreJson({ items: [] });

  const items = await prisma.baccaratBet.findMany({
    where: { roundId: round.id, userId: auth.sub },
    orderBy: { createdAt: "asc" },
  });

  return noStoreJson({ items });
}
