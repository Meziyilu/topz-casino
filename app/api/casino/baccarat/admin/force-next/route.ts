import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ROOMS, refundUsers } from "../_utils";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const room = (url.searchParams.get("room") || "").toUpperCase();
  const seconds = Number(url.searchParams.get("seconds") || "60");
  if (!ROOMS.includes(room as any)) return NextResponse.json({ error: "BAD_ROOM" }, { status: 400 });

  const round = await prisma.$transaction(async (tx) => {
    // 清掉所有未結束並退款
    const actives = await tx.round.findMany({ where: { room: room as any, NOT: { phase: "SETTLED" } }, select: { id: true } });
    if (actives.length) {
      const ids = actives.map(r => r.id);
      const bets = await tx.bet.findMany({ where: { roundId: { in: ids } }, select: { userId: true, amount: true } });
      await refundUsers(tx as any, bets);
      await tx.round.updateMany({ where: { id: { in: ids } }, data: { phase: "SETTLED", outcome: null, endedAt: new Date() } });
    }
    // 開新局
    const now = new Date();
    return tx.round.create({
      data: { room: room as any, phase: "BETTING", startedAt: now, endsAt: new Date(now.getTime() + seconds * 1000) },
      select: { id: true, room: true, phase: true, startedAt: true, endsAt: true },
    });
  });

  return NextResponse.json({ ok: true, round });
}
