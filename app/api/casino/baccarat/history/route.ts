// app/api/casino/baccarat/history/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import prisma from "@/lib/prisma";
import { noStoreJson } from "@/lib/http";

type Room = "R30" | "R60" | "R90";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const room = (searchParams.get("room") as Room) || "R60";

  const items = await prisma.baccaratRound.findMany({
    where: { room, phase: "SETTLED" },
    orderBy: { roundNo: "desc" },
    take: 10,
    select: {
      roundNo: true,
      outcome: true,
      playerPair: true,
      bankerPair: true,
      anyPair: true,
      perfectPair: true,
      usedNoCommission: true,
      settledAt: true,
    },
  });

  return noStoreJson({ items });
}
