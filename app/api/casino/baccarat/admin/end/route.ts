import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ROOMS, getActiveRound, refundUsers } from "../_utils";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const room = (url.searchParams.get("room") || "").toUpperCase();
  if (!ROOMS.includes(room as any)) return NextResponse.json({ error: "BAD_ROOM" }, { status: 400 });

  const active = await getActiveRound(room as any);
  if (!active) return NextResponse.json({ error: "NO_ROUND" }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    const bets = await tx.bet.findMany({ where: { roundId: active.id }, select: { userId: true, amount: true } });
    await refundUsers(tx as any, bets);
    await tx.round.update({ where: { id: active.id }, data: { phase: "SETTLED", outcome: null, endedAt: new Date() } });
  });

  return NextResponse.json({ ok: true });
}
