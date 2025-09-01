// app/api/casino/baccarat/bet/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import prisma from "@/lib/prisma";
import { verifyJWT } from "@/lib/jwt";
import { calcTiming } from "@/lib/gameclock";
import { noStoreJson } from "@/lib/http";

type Room = "R30" | "R60" | "R90";
type PlaceBetBody = { room?: Room; side: "PLAYER"|"BANKER"|"TIE"|"PLAYER_PAIR"|"BANKER_PAIR"; amount: number };

export async function POST(req: Request) {
  const auth = verifyJWT(req);
  if (!auth?.sub) return noStoreJson({ error: "UNAUTHORIZED" }, 401);

  const body = (await req.json().catch(() => null)) as PlaceBetBody | null;
  if (!body || !body.side || !Number.isInteger(body.amount) || body.amount <= 0) {
    return noStoreJson({ error: "BAD_REQUEST" }, 400);
  }

  const room = body.room || "R60";
  const now = new Date();
  const { roundNo, startedAt, revealAt, lockAt, locked } = calcTiming(room, now);
  if (locked) return noStoreJson({ error: "LOCKED" }, 423);

  let round = await prisma.baccaratRound.findFirst({ where: { room, roundNo } });
  if (!round) {
    round = await prisma.baccaratRound.create({
      data: { room, roundNo, phase: "BETTING", playerCards: [], bankerCards: [], startedAt, lockAt, revealAt },
    });
  }
  if (round.phase !== "BETTING") return noStoreJson({ error: "LOCKED" }, 423);

  // 下注：檢查餘額 → 扣款 → 台帳 → 建 bet （同一交易）
  try {
    const bet = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: auth.sub }, select: { balance: true } });
      if (!user || user.balance < body.amount) throw new Error("INSUFFICIENT_FUNDS");

      await tx.user.update({ where: { id: auth.sub }, data: { balance: { decrement: body.amount } } });
      await tx.ledger.create({
        data: { userId: auth.sub, type: "BET_PLACED", target: "WALLET", amount: -body.amount, note: `Baccarat R${roundNo} ${body.side}` },
      });
      return tx.baccaratBet.create({ data: { userId: auth.sub, roundId: round!.id, side: body.side, amount: body.amount } });
    });

    return noStoreJson({ ok: true, betId: bet.id });
  } catch (e: any) {
    if (String(e?.message) === "INSUFFICIENT_FUNDS") return noStoreJson({ error: "INSUFFICIENT_FUNDS" }, 402);
    return noStoreJson({ error: "BET_FAILED" }, 500);
  }
}
