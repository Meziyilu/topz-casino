// app/api/casino/baccarat/bet/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/authz";
import { ensureCurrentRound, getPhaseForRound, ROOM_DURATION } from "@/services/baccarat.service";

type BetSide =
  | "PLAYER"
  | "BANKER"
  | "TIE"
  | "PLAYER_PAIR"
  | "BANKER_PAIR"
  | "ANY_PAIR"
  | "PERFECT_PAIR"
  | "BANKER_SUPER_SIX";

export async function POST(req: Request) {
  try {
    const me = await getUserFromRequest(req);
    if (!me) return NextResponse.json({ ok: false, error: "UNAUTH" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const room = String((body.room || "R60")).toUpperCase() as any;
    const side = String(body.side || "");
    const amount = Number(body.amount || 0);

    // 基本驗證
    const VALID: BetSide[] = [
      "PLAYER",
      "BANKER",
      "TIE",
      "PLAYER_PAIR",
      "BANKER_PAIR",
      "ANY_PAIR",
      "PERFECT_PAIR",
      "BANKER_SUPER_SIX",
    ];
    if (!VALID.includes(side as BetSide)) throw new Error("BAD_SIDE");
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("BAD_AMOUNT");

    const round = await ensureCurrentRound(room);
    const phase = getPhaseForRound(round, ROOM_DURATION[round.room]);
    if (phase !== "BETTING") throw new Error("NOT_BETTING");

    // 餘額檢查
    const user = await prisma.user.findUnique({ where: { id: me.id }, select: { id: true, balance: true } });
    if (!user) throw new Error("USER_NOT_FOUND");
    if (user.balance < amount) throw new Error("INSUFFICIENT");

    // 交易
    const bet = await prisma.$transaction(async (tx) => {
      // 扣錢（Ledger）
      await tx.ledger.create({
        data: {
          userId: me.id,
          type: "BET_PLACED",
          target: "WALLET",
          amount: -amount,
          roundId: round.id,
          room: round.room,
        },
      });
      await tx.user.update({
        where: { id: me.id },
        data: { balance: { decrement: amount } },
      });

      // 建 bet
      const b = await tx.bet.create({
        data: {
          userId: me.id,
          roundId: round.id,
          side: side as any,
          amount,
        },
        select: { id: true, amount: true, side: true },
      });

      return b;
    });

    return NextResponse.json({ ok: true, bet });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "BET_FAIL" }, { status: 400 });
  }
}
