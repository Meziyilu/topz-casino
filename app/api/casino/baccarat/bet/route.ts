import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import type { RoomCode, BetSide } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  room: z.string(),
  roundId: z.string(),
  side: z.string(),
  amount: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.parse(body);

    // demo: userId from header
    const userId = req.headers.get("x-user-id") || "";
    if (!userId) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    // 取得目前 round
    const round = await prisma.round.findUnique({
      where: { id: parsed.roundId },
    });
    if (!round || round.phase !== "BETTING") {
      return NextResponse.json({ error: "ROUND_NOT_OPEN" }, { status: 400 });
    }

    // 扣錢 + 建立下注
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { balance: true },
      });
      if (!user || user.balance < parsed.amount) {
        throw new Error("INSUFFICIENT_FUNDS");
      }

      // 扣錢
      const updated = await tx.user.update({
        where: { id: userId },
        data: { balance: { decrement: parsed.amount } },
        select: { balance: true },
      });

      // 建立下注紀錄
      await tx.baccaratBet.create({
        data: {
          userId,
          room: parsed.room as RoomCode,
          roundId: parsed.roundId,
          side: parsed.side as BetSide,
          amount: parsed.amount,
        },
      });

      // Ledger 紀錄 (下注)
      await tx.ledger.create({
        data: {
          userId,
          type: "BET_PLACED",
          target: "WALLET",
          amount: parsed.amount,
          room: parsed.room as RoomCode,
          roundId: parsed.roundId,
        },
      });

      return updated;
    });

    return NextResponse.json({
      ok: true,
      balance: result.balance,
    });
  } catch (e: any) {
    console.error("BET_ERROR", e);
    return NextResponse.json(
      { error: e?.message || "BET_FAILED" },
      { status: 400 }
    );
  }
}
