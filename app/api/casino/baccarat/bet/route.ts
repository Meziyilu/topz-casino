// app/api/casino/baccarat/bet/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyJWT } from "@/lib/jwt";
import { Prisma } from "@prisma/client";

type BetSide =
  | "PLAYER" | "BANKER" | "TIE"
  | "PLAYER_PAIR" | "BANKER_PAIR"
  | "ANY_PAIR" | "PERFECT_PAIR";

function validSide(x: string): x is BetSide {
  return [
    "PLAYER","BANKER","TIE",
    "PLAYER_PAIR","BANKER_PAIR","ANY_PAIR","PERFECT_PAIR",
  ].includes(x);
}

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ error: "未登入" }, { status: 401 });
    const payload = await verifyJWT(token);
    const userId = String(payload.sub);

    const body = await req.json().catch(() => ({}));
    const roomCode = String(body?.room || req.nextUrl.searchParams.get("room") || "").toUpperCase();
    const sideStr = String(body?.side || "");
    const amount = Number(body?.amount);

    if (!roomCode) return NextResponse.json({ error: "缺少房間參數 room" }, { status: 400 });
    if (!validSide(sideStr)) return NextResponse.json({ error: "下注面不合法" }, { status: 400 });
    if (!Number.isInteger(amount) || amount <= 0) return NextResponse.json({ error: "金額不合法" }, { status: 400 });

    const room = await prisma.room.findFirst({ where: { code: roomCode as any } });
    if (!room) return NextResponse.json({ error: "找不到房間" }, { status: 404 });

    // 取得目前進行中的回合（請依你的實作調整）
    const round = await prisma.round.findFirst({
      where: { roomId: room.id },
      orderBy: [{ day: "desc" }, { roundSeq: "desc" }],
    });
    if (!round || round.phase !== "BETTING") {
      return NextResponse.json({ error: "現在不是下注時間" }, { status: 400 });
    }

    const res = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1) 餘額檢查與扣款
      const u = await tx.user.findUnique({ where: { id: userId } });
      if (!u) throw new Error("找不到使用者");
      if (u.balance < amount) throw new Error("餘額不足");

      const afterDebit = await tx.user.update({
        where: { id: userId },
        data: { balance: { decrement: amount } },
        select: { balance: true, bankBalance: true },
      });

      // 2) 建立下注
      const bet = await tx.bet.create({
        data: {
          userId,
          roomId: room.id,
          day: round.day,
          roundSeq: round.roundSeq,
          side: sideStr as any,
          amount,
          roundId: round.id,
        },
      });

      // 3) 流水（target 必須是 WALLET）
      await tx.ledger.create({
        data: {
          userId,
          type: "BET_PLACED",
          target: "WALLET",
          delta: -amount,
          memo: `下注 ${sideStr} (room ${room.code} #${round.roundSeq})`,
          balanceAfter: afterDebit.balance,
          bankAfter: afterDebit.bankBalance,
        },
      });

      return { betId: bet.id, balance: afterDebit.balance };
    });

    return NextResponse.json(res);
  } catch (e: any) {
    const msg = e?.message || "下注失敗";
    const status = /不足|不合法|未登入|不是下注/.test(msg) ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
