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
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

export async function POST(req: Request) {
  try {
    const me = await getUserFromRequest(req);
    if (!me) return noStoreJson({ error: "尚未登入" }, 401);

    const body = await req.json().catch(() => ({}));
    const roomCode = String(body?.roomCode || "");
    const side = String(body?.side || "");
    const amount = Number(body?.amount || 0);

    if (!roomCode) return noStoreJson({ error: "缺少房間代碼" }, 400);
    if (
      ![
        "PLAYER",
        "BANKER",
        "TIE",
        "PLAYER_PAIR",
        "BANKER_PAIR",
        "ANY_PAIR",
        "PERFECT_PAIR",
      ].includes(side)
    ) {
      return noStoreJson({ error: "side 非法" }, 400);
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return noStoreJson({ error: "amount 必須是大於 0 的數字" }, 400);
    }

    // 找房間
    const room = await prisma.room.findUnique({ where: { code: roomCode as any } });
    if (!room) return noStoreJson({ error: "房間不存在" }, 404);

    // 取最新一局（你的 state 會負責日切與下一局）
    const round = await prisma.round.findFirst({
      where: { roomId: room.id },
      orderBy: { roundSeq: "desc" },
      select: { id: true, roundSeq: true, phase: true },
    });
    if (!round) return noStoreJson({ error: "尚未建立任何局數" }, 500);
    if (round.phase !== "BETTING") return noStoreJson({ error: "非下注階段" }, 400);

    const result = await prisma.$transaction(async (tx) => {
      // 檢查餘額與扣款
      const u = await tx.user.findUnique({
        where: { id: me.id },
        select: { balance: true, bankBalance: true },
      });
      if (!u) throw new Error("找不到使用者");
      if (u.balance < amount) throw new Error("餘額不足");

      const afterDebit = await tx.user.update({
        where: { id: me.id },
        data: { balance: { decrement: amount } },
        select: { balance: true, bankBalance: true },
      });

      // 建立下注（**只用 roundId**；不要塞不存在的欄位）
      await tx.bet.create({
        data: {
          userId: me.id,
          roundId: round.id,
          side: side as any,
          amount,
        },
      });

      // 記帳（下注→錢包扣款）
      await tx.ledger.create({
        data: {
          userId: me.id,
          type: "BET" as any,
          target: "WALLET" as any, // 若你想記在下注邊可改成 side as any
          delta: -amount,
          memo: `下注 ${side} (房間 ${room.code} #${round.roundSeq})`,
          balanceAfter: afterDebit.balance,
          bankAfter: afterDebit.bankBalance,
        },
      });

      return { balance: afterDebit.balance };
    });

    return noStoreJson({ ok: true, balance: result.balance });
  } catch (e: any) {
    return noStoreJson({ error: e?.message || "下注失敗" }, 400);
  }
}
