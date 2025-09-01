// app/api/casino/baccarat/bet/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyRequest } from "@/lib/jwt";

type BetSide =
  | "PLAYER"
  | "BANKER"
  | "TIE"
  | "PLAYER_PAIR"
  | "BANKER_PAIR";

const noStore = (payload: any, status = 200) =>
  NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control":
        "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
    },
  });

type PostBody = {
  roomId: string;
  roundId: string;
  side: BetSide;
  amount: number;
};

export async function POST(req: Request) {
  // ✅ 統一改成同步驗證，不再使用 verifyJWT<...>
  const auth = verifyRequest(req);
  const userId = auth?.userId || auth?.sub || null;
  if (!userId) return noStore({ error: "UNAUTHORIZED" }, 401);

  let body: PostBody;
  try {
    body = await req.json();
  } catch {
    return noStore({ error: "INVALID_JSON" }, 400);
  }

  // 基本驗證
  if (!body?.roomId || !body?.roundId)
    return noStore({ error: "MISSING_PARAMS" }, 400);

  const validSides: BetSide[] = [
    "PLAYER",
    "BANKER",
    "TIE",
    "PLAYER_PAIR",
    "BANKER_PAIR",
  ];
  if (!validSides.includes(body.side))
    return noStore({ error: "INVALID_SIDE" }, 400);

  if (
    !Number.isInteger(body.amount) ||
    body.amount <= 0 ||
    body.amount > 5_000_000
  ) {
    return noStore({ error: "INVALID_AMOUNT" }, 400);
  }

  // 確認回合狀態（下注期）
  const round = await prisma.round.findUnique({
    where: { id: body.roundId },
    select: { id: true, roomId: true, phase: true },
  });
  if (!round) return noStore({ error: "ROUND_NOT_FOUND" }, 404);
  if (round.roomId !== body.roomId)
    return noStore({ error: "ROOM_MISMATCH" }, 400);
  if (round.phase !== "BETTING")
    return noStore({ error: "ROUND_NOT_BETTING" }, 400);

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 取餘額
      const me = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, balance: true, bankBalance: true },
      });
      if (!me) throw new Error("USER_NOT_FOUND");
      if (me.balance < body.amount) throw new Error("INSUFFICIENT_BALANCE");

      // 建立下注
      const bet = await tx.bet.create({
        data: {
          userId: me.id,
          roomId: body.roomId,
          roundId: body.roundId,
          side: body.side as any,
          amount: body.amount,
        },
        select: {
          id: true,
          side: true,
          amount: true,
          createdAt: true,
          roomId: true,
          roundId: true,
        },
      });

      // 扣款
      const updated = await tx.user.update({
        where: { id: me.id },
        data: { balance: { decrement: body.amount } },
        select: { balance: true, bankBalance: true },
      });

      // 建立流水
      await tx.ledger.create({
        data: {
          userId: me.id,
          type: "BET_PLACED",
          target: "WALLET",
          delta: -body.amount,
          balanceAfter: updated.balance,
          bankAfter: updated.bankBalance,
          memo: `Baccarat bet ${bet.id}`,
          fromTarget: "WALLET",
          toTarget: null,
          amount: body.amount,
          fee: 0,
          transferGroupId: null,
          peerUserId: null,
          meta: {
            game: "baccarat",
            betId: bet.id,
            roomId: body.roomId,
            roundId: body.roundId,
            side: body.side,
          },
        } as any,
      });

      return { bet, balanceAfter: updated.balance, bankAfter: updated.bankBalance };
    });

    return noStore({
      ok: true,
      userId,
      bet: result.bet,
      balanceAfter: result.balanceAfter,
      bankAfter: result.bankAfter,
      serverTime: new Date().toISOString(),
    });
  } catch (e: any) {
    if (e?.message === "USER_NOT_FOUND")
      return noStore({ error: "USER_NOT_FOUND" }, 404);
    if (e?.message === "INSUFFICIENT_BALANCE")
      return noStore({ error: "INSUFFICIENT_BALANCE" }, 400);
    return noStore({ error: "BET_FAILED" }, 500);
  }
}
