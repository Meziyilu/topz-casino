// app/api/casino/baccarat/bet/route.ts
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

function noStoreJson(payload: any, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control":
        "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
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

type Side = "PLAYER" | "BANKER" | "TIE";

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);

    // 1) 驗身分
    const me = await getUserFromRequest(req);
    if (!me) return noStoreJson({ error: "請先登入" }, 401);

    // 2) 驗輸入
    const body = await req.json().catch(() => ({}));
    const roomCode = String(body?.roomCode || "").toUpperCase();
    const side: Side = body?.side;
    const amount = Number(body?.amount);

    if (!["R30", "R60", "R90"].includes(roomCode)) {
      return noStoreJson({ error: "房間代碼錯誤" }, 400);
    }
    if (!["PLAYER", "BANKER", "TIE"].includes(String(side))) {
      return noStoreJson({ error: "下注方位錯誤" }, 400);
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return noStoreJson({ error: "下注金額需為正整數" }, 400);
    }

    // 3) 取房間
    const room = await prisma.room.findFirst({
      where: { code: roomCode as any },
      select: { id: true, durationSeconds: true },
    });
    if (!room) return noStoreJson({ error: "房間不存在" }, 404);

    const dayStartUtc = taipeiDayStart(new Date());

    // 4) 今日最新一局（沒有就自動開第一局）
    let round = await prisma.round.findFirst({
      where: { roomId: room.id, day: dayStartUtc },
      orderBy: [{ roundSeq: "desc" }],
      select: {
        id: true,
        roundSeq: true,
        phase: true,
        startedAt: true,
        createdAt: true,
      },
    });

    if (!round) {
      const now = new Date();
      round = await prisma.$transaction(async (tx) => {
        return tx.round.create({
          data: {
            roomId: room.id,
            day: dayStartUtc,
            roundSeq: 1,
            phase: "BETTING" as any,
            createdAt: now,
            startedAt: now,
          },
          select: {
            id: true,
            roundSeq: true,
            phase: true,
            startedAt: true,
            createdAt: true,
          },
        });
      });
    }

    // 5) 是否仍在下注時間
    const startMs = new Date(round.startedAt ?? round.createdAt).getTime();
    const elapsed = Math.floor((Date.now() - startMs) / 1000);
    const betWindow = room.durationSeconds; // 與 /state 同參數
    const stillBetting = round.phase === "BETTING" && elapsed < betWindow;

    if (!stillBetting) {
      return noStoreJson(
        {
          error: "目前非下注時間",
          debug: {
            phase: round.phase,
            elapsed,
            betWindow,
            roundId: round.id,
            roundSeq: round.roundSeq,
          },
        },
        400
      );
    }

    // 6) 交易：餘額→扣款→建立 Bet(roundId)→Ledger
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: me.id },
        select: { balance: true, bankBalance: true },
      });
      if (!user) throw new Error("使用者不存在");
      if (user.balance < amount) {
        return { ok: false as const, error: "餘額不足" };
      }

      const after = await tx.user.update({
        where: { id: me.id },
        data: { balance: { decrement: amount } },
        select: { balance: true, bankBalance: true },
      });

      const bet = await tx.bet.create({
        data: {
          userId: me.id,
          roundId: round!.id, // ✅ 你的 Bet 只有 roundId，不要寫 roomId
          side: side as any,
          amount,
        },
        select: { id: true, side: true, amount: true },
      });

      await tx.ledger.create({
        data: {
          userId: me.id,
          type: "BET_PLACED" as any,
          target: "WALLET" as any,
          delta: -amount,
          memo: `下注 ${side} ${amount}`,
          balanceAfter: after.balance,
          bankAfter: after.bankBalance,
        },
      });

      return { ok: true as const, betId: bet.id, balance: after.balance };
    });

    if (!result.ok) {
      return noStoreJson({ error: result.error }, 400);
    }

    return noStoreJson({
      ok: true,
      betId: result.betId,
      balance: result.balance,
      message: "下注成功",
    });
  } catch (e: any) {
    return noStoreJson({ error: e?.message || "Server error" }, 500);
  }
}
