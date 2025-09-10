// app/api/casino/baccarat/bet/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { BetSide, RoomCode } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getOptionalUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

const Body = z.object({
  room: z.enum(["R30", "R60", "R90"] as const),
  roundId: z.string().min(1),
  bets: z.array(
    z.object({
      side: z.enum([
        "PLAYER",
        "BANKER",
        "TIE",
        "PLAYER_PAIR",
        "BANKER_PAIR",
        "ANY_PAIR",
        "PERFECT_PAIR",
        "BANKER_SUPER_SIX",
      ] as const),
      amount: z.number().int().positive(),
    })
  ),
});

export async function POST(req: NextRequest) {
  try {
    // 必須登入
    const userId = await getOptionalUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    // 驗證 body
    const body = await req.json();
    const parsed = Body.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "BAD_BODY" }, { status: 400 });
    }
    const { room, roundId, bets } = parsed.data;

    // 檢查回合
    const round = await prisma.round.findUnique({ where: { id: roundId } });
    if (!round || round.room !== (room as RoomCode)) {
      return NextResponse.json({ error: "ROUND_NOT_FOUND" }, { status: 404 });
    }
    if (round.phase !== "BETTING") {
      return NextResponse.json({ error: "ROUND_NOT_BETTING" }, { status: 409 });
    }

    // 扣錢
    const total = bets.reduce((s, b) => s + b.amount, 0);
    const me = await prisma.user.findUnique({
      where: { id: userId },
      select: { balance: true },
    });
    if (!me) return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 });
    if (me.balance < total)
      return NextResponse.json({ error: "INSUFFICIENT_BALANCE" }, { status: 409 });

    // 寫入下注與帳本
    const tx = await prisma.$transaction(async (tx) => {
      // 扣錢
      await tx.user.update({
        where: { id: userId },
        data: { balance: { decrement: total } },
      });

      // 新增下注
      await tx.bet.createMany({
        data: bets.map((b) => ({
          userId,
          roundId,
          side: b.side as BetSide,
          amount: b.amount,
        })),
      });

      // 新增帳本
      await tx.ledger.create({
        data: {
          userId,
          type: "BET_PLACED",
          target: "WALLET",
          amount: -total,
          room,
          roundId,
        },
      });

      // 回傳最新餘額 + 當局下注總和
      const wallet = await tx.user.findUnique({
        where: { id: userId },
        select: { balance: true },
      });

      const myBetsRaw = await tx.bet.findMany({
        where: { roundId, userId },
        select: { side: true, amount: true },
      });

      const myBets: Partial<Record<BetSide, number>> = {};
      for (const it of myBetsRaw) {
        myBets[it.side] = (myBets[it.side] ?? 0) + it.amount;
      }

      return { wallet: wallet?.balance ?? 0, myBets };
    });

    return NextResponse.json({
      ok: true,
      wallet: tx.wallet,
      myBets: tx.myBets, // ✅ 讓前端下注面板能直接刷新
    });
  } catch (e) {
    console.error("[bet] error:", e);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
