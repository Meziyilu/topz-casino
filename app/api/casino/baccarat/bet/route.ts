// app/api/casino/baccarat/bet/route.ts
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

// 小工具：禁止快取回應
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

// 取得台北當日 00:00（以 UTC 儲存）
function taipeiDayStart(date = new Date()) {
  const utc = date.getTime();
  const tpe = utc + 8 * 3600_000;
  const tpeStart = Math.floor(tpe / 86_400_000) * 86_400_000;
  return new Date(tpeStart - 8 * 3600_000);
}

type Side = "PLAYER" | "BANKER" | "TIE";

export async function POST(req: Request) {
  try {
    const me = await getUserFromRequest(req);
    if (!me) return noStoreJson({ error: "請先登入" }, 401);

    const body = await req.json().catch(() => ({}));
    const roomCode = String(body?.roomCode || "").toUpperCase();
    const side: Side = body?.side;
    const amount = Number(body?.amount);

    if (!roomCode || !["R30", "R60", "R90"].includes(roomCode)) {
      return noStoreJson({ error: "房間代碼錯誤" }, 400);
    }
    if (!["PLAYER", "BANKER", "TIE"].includes(String(side))) {
      return noStoreJson({ error: "下注方位錯誤" }, 400);
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return noStoreJson({ error: "下注金額需為正整數" }, 400);
    }

    // 房間
    const room = await prisma.room.findFirst({
      where: { code: roomCode as any },
      select: { id: true, durationSeconds: true },
    });
    if (!room) return noStoreJson({ error: "房間不存在" }, 404);

    const dayStartUtc = taipeiDayStart(new Date());

    // 取當日「最新一局」
    const round = await prisma.round.findFirst({
      where: { roomId: room.id, day: dayStartUtc },
      orderBy: [{ roundSeq: "desc" }],
      select: {
        id: true,
        phase: true,
        startedAt: true,
        createdAt: true,
      },
    });
    if (!round) return noStoreJson({ error: "目前無可下注的局" }, 400);
    if (round.phase !== "BETTING") {
      return noStoreJson({ error: "目前非下注時間" }, 400);
    }

    // 交易：扣款 + 建立 Bet + 寫 Ledger
    const result = await prisma.$transaction(async (tx) => {
      // 讀取最新餘額
      const user = await tx.user.findUnique({
        where: { id: me.id },
        select: { balance: true, bankBalance: true },
      });
      if (!user) throw new Error("使用者不存在");
      if (user.balance < amount) {
        return { ok: false, error: "餘額不足" } as const;
      }

      // 扣錢
      const afterWallet = await tx.user.update({
        where: { id: me.id },
        data: { balance: { decrement: amount } },
        select: { balance: true, bankBalance: true },
      });

      // 建立下注（⚠️ 只寫 roundId，**不要** roomId）
      const bet = await tx.bet.create({
        data: {
          userId: me.id,
          roundId: round.id,
          side: side as any,
          amount,
        },
        select: { id: true, side: true, amount: true, createdAt: true },
      });

      // 記帳
      await tx.ledger.create({
        data: {
          userId: me.id,
          type: "BET_PLACED" as any,
          target: "WALLET" as any,
          delta: -amount,
          memo: `下注 ${side} ${amount}`,
          balanceAfter: afterWallet.balance,
          bankAfter: afterWallet.bankBalance,
        },
      });

      return {
        ok: true as const,
        betId: bet.id,
        balance: afterWallet.balance,
      };
    });

    if (!result.ok) return noStoreJson({ error: result.error }, 400);

    return noStoreJson({
      ok: true,
      betId: result.betId,
      balance: result.balance,
    });
  } catch (e: any) {
    return noStoreJson({ error: e?.message || "Server error" }, 500);
  }
}
