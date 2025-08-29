export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import type { BetSide, RoundPhase } from "@prisma/client";

function noStoreJson(payload: any, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

const SIDES: BetSide[] = ["PLAYER", "BANKER", "TIE", "PLAYER_PAIR", "BANKER_PAIR"];

export async function POST(req: Request) {
  try {
    const me = await getUserFromRequest(req);
    if (!me) return noStoreJson({ error: "未登入" }, 401);

    const { roundId, side, amount } = await req.json();

    if (!roundId || !side || !amount) {
      return noStoreJson({ error: "缺少參數" }, 400);
    }
    if (!SIDES.includes(side)) {
      return noStoreJson({ error: "不支援的投注項" }, 400);
    }
    const amt = parseInt(String(amount), 10);
    if (!amt || amt <= 0) {
      return noStoreJson({ error: "金額必須 > 0" }, 400);
    }

    const result = await prisma.$transaction(async (tx) => {
      const round = await tx.round.findUnique({
        where: { id: String(roundId) },
        select: { id: true, phase: true },
      });
      if (!round) throw new Error("找不到該局");
      if ((round.phase as RoundPhase) !== "BETTING") throw new Error("非下注時間");

      const u = await tx.user.findUnique({ where: { id: me.id } });
      if (!u) throw new Error("找不到使用者");
      if (u.balance < amt) throw new Error("錢包餘額不足");

      const after = await tx.user.update({
        where: { id: me.id },
        data: { balance: { decrement: amt } },
        select: { balance: true, bankBalance: true },
      });

      const bet = await tx.bet.create({
        data: {
          userId: me.id,
          roundId: round.id,
          side: side as BetSide,
          amount: amt,
        },
        select: { id: true },
      });

      await tx.ledger.create({
        data: {
          userId: me.id,
          type: "BET_PLACED",
          target: "WALLET",
          delta: -amt,
          memo: `下注 ${side}`,
          balanceAfter: after.balance,
          bankAfter: after.bankBalance,
        },
      });

      return { betId: bet.id, balance: after.balance };
    });

    return noStoreJson(result);
  } catch (e: any) {
    return noStoreJson({ error: e.message || "Server error" }, 400);
  }
}
