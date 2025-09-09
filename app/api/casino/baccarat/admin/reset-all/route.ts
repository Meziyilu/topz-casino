import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ROOMS, refundUsers } from "../_utils";

export const dynamic = "force-dynamic";

export async function POST() {
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    const actives = await tx.round.findMany({
      where: { room: { in: ROOMS as any }, NOT: { phase: "SETTLED" } },
      select: { id: true },
    });
    if (!actives.length) return;
    const ids = actives.map(r => r.id);
    const bets = await tx.bet.findMany({ where: { roundId: { in: ids } }, select: { userId: true, amount: true } });
    await refundUsers(tx as any, bets);
    await tx.round.updateMany({ where: { id: { in: ids } }, data: { phase: "SETTLED", outcome: null, endedAt: now } });
  });
  return NextResponse.json({ ok: true });
}
