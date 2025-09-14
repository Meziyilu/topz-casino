import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { BetSide, RoomCode } from "@prisma/client";
import { nextPhases } from "@/lib/baccarat";
import { getUserFromRequest } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  room: RoomCode;
  roundId: string;
  side: BetSide;
  amount: number;
};

function isBetSide(v: any): v is BetSide {
  return [
    "PLAYER",
    "BANKER",
    "TIE",
    "PLAYER_PAIR",
    "BANKER_PAIR",
    "ANY_PAIR",
    "PERFECT_PAIR",
    "BANKER_SUPER_SIX",
  ].includes(v);
}

export async function POST(req: NextRequest) {
  try {
    // 1) 取得登入者（不含餘額）
    const auth = await getUserFromRequest(req);
    if (!auth) {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    // 2) 解析 body
    const { room, roundId, side, amount } = (await req.json()) as Body;

    if (!room || !roundId || !isBetSide(side) || !Number.isInteger(amount) || amount <= 0) {
      return NextResponse.json({ ok: false, error: "BAD_REQUEST" }, { status: 400 });
    }

    // 3) 查 round 並檢查是否封盤
    const round = await prisma.round.findUnique({ where: { id: roundId } });
    if (!round || round.room !== room) {
      return NextResponse.json({ ok: false, error: "ROUND_NOT_FOUND" }, { status: 404 });
    }

    const phase = nextPhases(new Date(), new Date(round.startedAt));
    if (phase.locked || round.phase !== "BETTING") {
      return NextResponse.json({ ok: false, error: "ROUND_LOCKED" }, { status: 400 });
    }

    // 4) 用 id 讀餘額（因為 AuthUser 沒帶 balance）
    const user = await prisma.user.findUnique({
      where: { id: auth.id },
      select: { id: true, balance: true },
    });
    if (!user) {
      return NextResponse.json({ ok: false, error: "USER_NOT_FOUND" }, { status: 404 });
    }
    if (user.balance < amount) {
      return NextResponse.json({ ok: false, error: "INSUFFICIENT_FUNDS" }, { status: 400 });
    }

    // 5) 交易：扣錢 + 建 bet + 寫 ledger
    const bet = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { balance: { decrement: amount } },
      });

      const created = await tx.bet.create({
        data: { userId: user.id, roundId, side, amount },
      });

      await tx.ledger.create({
        data: {
          userId: user.id,
          type: "BET_PLACED",
          target: "WALLET",
          amount,
          room,       // 方便對帳
          roundId,    // 關聯回合
        },
      });

      return created;
    });

    return NextResponse.json({ ok: true, bet });
  } catch (e: any) {
    console.error("bet error:", e);
    return NextResponse.json(
      { ok: false, error: e?.message ?? "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
