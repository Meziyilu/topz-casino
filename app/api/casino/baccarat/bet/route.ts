// app/api/casino/baccarat/bet/route.ts
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

const asAny = <T = any>(v: unknown) => v as T;

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

// 台北當天 00:00（用 UTC 儲存）
function taipeiDayStart(date = new Date()) {
  const ms = date.getTime() + 8 * 3600_000;
  const startMs = Math.floor(ms / 86_400_000) * 86_400_000;
  return new Date(startMs - 8 * 3600_000);
}

export async function POST(req: Request) {
  try {
    const me = await getUserFromRequest(req);
    if (!me) return noStoreJson({ error: "未登入" }, 401);

    const body = await req.json();
    const { roomCode, side, amount } = body as {
      roomCode: string;
      side: "PLAYER" | "BANKER" | "TIE" | "PLAYER_PAIR" | "BANKER_PAIR";
      amount: number;
    };

    if (!roomCode || !side || !amount || amount <= 0) {
      return noStoreJson({ error: "參數錯誤" }, 400);
    }

    // 找房間
    const room = await prisma.room.findFirst({
      where: { code: asAny(roomCode) },
      select: { id: true, code: true, durationSeconds: true },
    });
    if (!room) return noStoreJson({ error: "房間不存在" }, 404);

    // 找當日最新局（必須在 BETTING）
    const day = taipeiDayStart(new Date());
    const round = await prisma.round.findFirst({
      where: { roomId: room.id, day },
      orderBy: [{ roundSeq: "desc" }],
      select: { id: true, phase: true },
    });
    if (!round) return noStoreJson({ error: "目前無進行中的局" }, 400);
    if ((round.phase as any) !== "BETTING") {
      return noStoreJson({ error: "非下注時間" }, 400);
    }

    // 餘額檢查
    const user = await prisma.user.findUnique({
      where: { id: me.id },
      select: { balance: true, bankBalance: true },
    });
    if (!user) return noStoreJson({ error: "使用者不存在" }, 404);
    if (user.balance < amount) return noStoreJson({ error: "餘額不足" }, 400);

    // 下注：扣款 + 建Bet + 記帳
    const bet = await prisma.$transaction(async (tx) => {
      const after = await tx.user.update({
        where: { id: me.id },
        data: { balance: { decrement: amount } },
        select: { balance: true, bankBalance: true },
      });

      const bet = await tx.bet.create({
        data: {
          userId: me.id,
          roundId: round.id, // ✅ 只存 roundId
          side: asAny(side),
          amount,
        },
      });

      await tx.ledger.create({
        data: {
          userId: me.id,
          type: asAny("BET_PLACED"),
          target: asAny("WALLET"),
          delta: -amount,
          memo: `下注 ${side} ${amount}`,
          balanceAfter: after.balance,
          bankAfter: after.bankBalance,
        },
      });

      return bet;
    });

    return noStoreJson({ ok: true, betId: bet.id });
  } catch (e: any) {
    return noStoreJson({ error: e?.message || "Server error" }, 500);
  }
}
