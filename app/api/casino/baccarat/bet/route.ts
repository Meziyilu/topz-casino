import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { roomCode, side, amount } = await req.json();
    const me = await getUserFromRequest(req);
    if (!me) return NextResponse.json({ error: "尚未登入" }, { status: 401 });

    // 找房間
    const room = await prisma.room.findUnique({ where: { code: roomCode } });
    if (!room) {
      return NextResponse.json({ error: "房間不存在" }, { status: 404 });
    }

    // 找最新回合
    const round = await prisma.round.findFirst({
      where: { roomId: room.id },
      orderBy: { roundSeq: "desc" },
    });
    if (!round || round.phase !== "BETTING") {
      return NextResponse.json({ error: "非下注階段" }, { status: 400 });
    }

    // 扣款 + 建立下注
    const result = await prisma.$transaction(async (tx) => {
      const u = await tx.user.findUnique({ where: { id: me.id } });
      if (!u) throw new Error("找不到使用者");
      if (u.balance < amount) throw new Error("餘額不足");

      const updated = await tx.user.update({
        where: { id: me.id },
        data: { balance: { decrement: amount } },
      });

      await tx.bet.create({
        data: {
          userId: me.id,
          roomId: room.id,
          day: round.day,
          roundSeq: round.roundSeq,
          side,
          amount,
        },
      });

      await tx.ledger.create({
        data: {
          userId: me.id,
          type: "BET",
          target: side,
          delta: -amount,
          memo: `下注 ${side} (房間 ${room.code} #${round.roundSeq})`,
          balanceAfter: updated.balance,
        },
      });

      return { balance: updated.balance };
    });

    return NextResponse.json({ ok: true, balance: result.balance });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "下注失敗" }, { status: 400 });
  }
}
