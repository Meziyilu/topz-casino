export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyRequest } from "@/lib/jwt";
import type { Prisma } from "@prisma/client";

type BetSide = "PLAYER" | "BANKER" | "TIE" | "PLAYER_PAIR" | "BANKER_PAIR";

function noStore<T>(payload: T, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

type PostBody = {
  roomId: string;
  roundId: string;
  side: BetSide;
  amount: number;
};

export async function POST(req: Request) {
  const auth = await verifyRequest(req);
  const userId =
    (auth as { userId?: string; sub?: string } | null)?.userId ??
    (auth as { sub?: string } | null)?.sub ??
    null;
  if (!userId) return noStore({ error: "UNAUTHORIZED" }, 401);

  let body: PostBody;
  try {
    body = await req.json();
  } catch {
    return noStore({ error: "INVALID_JSON" }, 400);
  }

  if (!body?.roomId || !body?.roundId) return noStore({ error: "MISSING_PARAMS" }, 400);

  const validSides: BetSide[] = ["PLAYER", "BANKER", "TIE", "PLAYER_PAIR", "BANKER_PAIR"];
  if (!validSides.includes(body.side)) return noStore({ error: "INVALID_SIDE" }, 400);

  if (!Number.isInteger(body.amount) || body.amount <= 0 || body.amount > 5_000_000) {
    return noStore({ error: "INVALID_AMOUNT" }, 400);
  }

  const round = await prisma.round.findUnique({
    where: { id: body.roundId },
    select: { id: true, roomId: true, phase: true },
  });
  if (!round) return noStore({ error: "ROUND_NOT_FOUND" }, 404);
  if (round.roomId !== body.roomId) return noStore({ error: "ROOM_MISMATCH" }, 400);
  if (round.phase !== "BETTING") return noStore({ error: "ROUND_NOT_BETTING" }, 400);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const me = await tx.user.findUnique({
        where: { id: String(userId) },
        select: { id: true, balance: true, bankBalance: true },
      });
      if (!me) throw new Error("USER_NOT_FOUND");
      if (me.balance < body.amount) throw new Error("INSUFFICIENT_BALANCE");

      const bet = await tx.bet.create({
        data: {
          userId: me.id,
          roomId: body.roomId,
          roundId: body.roundId,
          side: body.side as Prisma.$Enums.BetSide,
          amount: body.amount,
        },
        select: { id: true, side: true, amount: true, createdAt: true, roomId: true, roundId: true },
      });

      const updated = await tx.user.update({
        where: { id: me.id },
        data: { balance: { decrement: body.amount } },
        select: { balance: true, bankBalance: true },
      });

      await tx.ledger.create({
        data: {
          userId: me.id,
          type: "BET_PLACED",
          target: "WALLET", // Prisma enum: BalanceTarget
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
          } as Prisma.InputJsonValue,
        },
      });

      return { bet, balanceAfter: updated.balance, bankAfter: updated.bankBalance };
    });

    return noStore({
      ok: true,
      userId: String(userId),
      bet: result.bet,
      balanceAfter: result.balanceAfter,
      bankAfter: result.bankAfter,
      serverTime: new Date().toISOString(),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "USER_NOT_FOUND") return noStore({ error: "USER_NOT_FOUND" }, 404);
    if (msg === "INSUFFICIENT_BALANCE") return noStore({ error: "INSUFFICIENT_BALANCE" }, 400);
    return noStore({ error: "BET_FAILED" }, 500);
  }
}
