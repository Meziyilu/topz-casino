export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getOrRotateRound } from "@/services/sicbo.service";
import { SicBoRoomCode } from "@prisma/client";

export async function POST(req: Request) {
  try {
    const { userId, roundId } = await req.json();
    if (!userId || !roundId) return NextResponse.json({ error: "MISSING_PARAMS" }, { status: 400 });

    const round = await prisma.sicBoRound.findUnique({ where: { id: roundId } });
    if (!round) return NextResponse.json({ error: "ROUND_NOT_FOUND" }, { status: 404 });

    // 用服務算封盤
    const { meta } = await getOrRotateRound(round.room as SicBoRoomCode);
    const willLock = round.startedAt.getTime() + (meta.drawIntervalSec - meta.lockBeforeRollSec) * 1000;
    const locked = Date.now() >= willLock || round.phase !== "BETTING";
    if (locked) return NextResponse.json({ error: "ROUND_LOCKED" }, { status: 400 });

    const bets = await prisma.sicBoBet.findMany({ where: { userId, roundId } });
    if (!bets.length) return NextResponse.json({ ok: true, refunded: 0 });

    const total = bets.reduce((s, b) => s + b.amount, 0);

    await prisma.$transaction(async (tx) => {
      await tx.sicBoBet.deleteMany({ where: { userId, roundId } });
      await tx.user.update({
        where: { id: userId },
        data: {
          balance: { increment: total },
          totalStaked: { decrement: BigInt(total) },
          netProfit: { increment: BigInt(total) },
        },
      });
      await tx.ledger.create({
        data: { userId, type: "ADMIN_ADJUST", target: "WALLET", amount: total, sicboRoom: round.room, sicboRoundId: round.id },
      });
    });

    return NextResponse.json({ ok: true, refunded: total });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "REFUND_FAILED" }, { status: 500 });
  }
}
