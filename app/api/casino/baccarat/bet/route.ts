// app/api/casino/baccarat/bet/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { LedgerType, BalanceTarget, RoomCode, BetSide } from "@prisma/client";

// Node 環境才能跑 Prisma
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BetSchema = z.object({
  room: z.enum(["R30", "R60", "R90"]),
  roundId: z.string(),
  side: z.nativeEnum(BetSide),
  amount: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = BetSchema.parse(body);

    // ⚠️ 這裡先模擬「目前登入的使用者」
    const userId = req.headers.get("x-user-id") ?? "demo-user";

    const round = await prisma.round.findUnique({
      where: { id: parsed.roundId },
    });
    if (!round) {
      return NextResponse.json(
        { ok: false, error: "ROUND_NOT_FOUND" },
        { status: 400 }
      );
    }

    // 判斷是否可下注（依狀態）
    const now = new Date();
    if (round.phase !== "BETTING" || now >= round.endsAt) {
      return NextResponse.json(
        { ok: false, error: "ROUND_LOCKED" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // 查餘額
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { balance: true },
      });
      if (!user) throw new Error("USER_NOT_FOUND");
      if (user.balance < parsed.amount) throw new Error("INSUFFICIENT_BALANCE");

      // 扣錢
      await tx.user.update({
        where: { id: userId },
        data: { balance: { decrement: parsed.amount } },
      });

      // 建立下注紀錄（Bet 沒有 room 欄位，只記 roundId）
      const bet = await tx.bet.create({
        data: {
          userId,
          roundId: parsed.roundId,
          side: parsed.side,
          amount: parsed.amount,
        },
      });

      // 建立 Ledger（Ledger 有 room，可以記錄房間）
      await tx.ledger.create({
        data: {
          userId,
          type: LedgerType.BET_PLACED,
          target: BalanceTarget.WALLET,
          amount: parsed.amount,
          room: parsed.room as RoomCode,
          roundId: parsed.roundId,
        },
      });

      return bet;
    });

    return NextResponse.json({ ok: true, bet: result });
  } catch (err: any) {
    console.error("BET_ERROR", err);
    return NextResponse.json(
      { ok: false, error: err.message ?? "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
