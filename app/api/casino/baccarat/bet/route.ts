// app/api/casino/baccarat/bet/route.ts
export const dynamic = "force-dynamic";
export const revalidate = 0;

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

function taipeiDayStart(date = new Date()) {
  const utc = date.getTime();
  const tpe = utc + 8 * 3600_000;
  const tpeStart = Math.floor(tpe / 86_400_000) * 86_400_000;
  return new Date(tpeStart - 8 * 3600_000);
}

export async function POST(req: Request) {
  try {
    const me = await getUserFromRequest(req);
    if (!me) return noStoreJson({ error: "尚未登入" }, 401);

    const body = await req.json();
    const { room: roomCode, side, amount } = body || {};
    if (!roomCode || !side || !amount || amount <= 0) {
      return noStoreJson({ error: "參數錯誤" }, 400);
    }

    const room = await prisma.room.findFirst({
      where: { code: asAny(String(roomCode).toUpperCase()) },
      select: { id: true, code: true, durationSeconds: true },
    });
    if (!room) return noStoreJson({ error: "房間不存在" }, 404);

    const dayStartUtc = taipeiDayStart(new Date());

    // 當前最新局
    const round = await prisma.round.findFirst({
      where: { roomId: room.id, day: dayStartUtc },
      orderBy: [{ roundSeq: "desc" }],
      select: { id: true, phase: true, startedAt: true, createdAt: true },
    });
    if (!round) return noStoreJson({ error: "尚未開局" }, 400);

    // 檢查是否仍在下注時間
    const startMs = new Date(round.startedAt ?? round.createdAt).getTime();
    const secGone = Math.floor((Date.now() - startMs) / 1000);
    if ((round.phase as any) !== "BETTING" || secGone >= room.durationSeconds) {
      return noStoreJson({ error: "非下注時間" }, 400);
    }

    // 交易內：扣錢 + 建立投注 + 留存帳本
    const result = await prisma.$transaction(async (tx: any) => {
      const u = await tx.user.findUnique({ where: { id: me.id } });
      if (!u) throw new Error("找不到使用者");
      if (u.balance < amount) throw new Error("餘額不足");

      const afterDebit = await tx.user.update({
        where: { id: me.id },
        data: { balance: { decrement: amount } },
        select: { balance: true, bankBalance: true },
      });

      const bet = await tx.bet.create({
        data: {
          userId: me.id,
          roundId: round.id,
          side: asAny(side),
          amount,
        },
        select: { id: true },
      });

      await tx.ledger.create({
        data: {
          userId: me.id,
          type: asAny("BET_PLACED"),
          target: asAny("WALLET"),
          delta: -amount,
          memo: `下注 ${side} (${room.code})`,
          balanceAfter: afterDebit.balance,
          bankAfter: afterDebit.bankBalance,
        },
      });

      return { betId: bet.id, balance: afterDebit.balance };
    });

    return noStoreJson({ ok: true, ...result });
  } catch (e: any) {
    return noStoreJson({ error: e?.message || "Server error" }, 500);
  }
}
