// app/api/casino/baccarat/settle/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import prisma from "@/lib/prisma";
import { noStoreJson } from "@/lib/http";

type Side = "PLAYER"|"BANKER"|"TIE"|"PLAYER_PAIR"|"BANKER_PAIR";
const flo = (x: number) => Math.floor(x);

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { room?: "R30"|"R60"|"R90"; roundNo?: number };
  const round = await prisma.baccaratRound.findFirst({
    where: {
      ...(body.room ? { room: body.room } : {}),
      ...(body.roundNo ? { roundNo: body.roundNo } : {}),
      phase: "SETTLED",
      payoutSettled: false,
    },
    orderBy: { roundNo: "desc" },
  });

  if (!round) return noStoreJson({ ok: true, message: "no round to settle" });
  if (!round.outcome) return noStoreJson({ error: "ROUND_NOT_REVEALED" }, 400);

  const bets = await prisma.baccaratBet.findMany({
    where: { roundId: round.id },
    select: { userId: true, side: true, amount: true },
  });

  // 聚合每位玩家應入帳總額（本金退回 + 派彩）
  const creditMap = new Map<string, number>();
  const add = (uid: string, amt: number) => { if (amt > 0) creditMap.set(uid, (creditMap.get(uid) ?? 0) + amt); };

  // 主注
  const settleMain = (side: Side, amount: number) => {
    if (side === "PLAYER") {
      if (round.outcome === "PLAYER") return amount + amount;
      if (round.outcome === "TIE")    return amount; // 退本金
      return 0;
    }
    if (side === "BANKER") {
      if (round.outcome === "BANKER") {
        const half = round.usedNoCommission ? flo(amount * 0.5) : amount;
        return amount + half;
      }
      if (round.outcome === "TIE")    return amount; // 退本金
      return 0;
    }
    if (side === "TIE") {
      if (round.outcome === "TIE")    return amount + amount * 8;
      return 0;
    }
    return null;
  };

  // 對子（11:1）
  const settlePair = (side: Side, amount: number) => {
    if (side === "PLAYER_PAIR") return round.playerPair ? amount + amount * 11 : 0;
    if (side === "BANKER_PAIR") return round.bankerPair ? amount + amount * 11 : 0;
    return null;
  };

  for (const b of bets) {
    let credit = settleMain(b.side as Side, b.amount);
    if (credit === null) credit = settlePair(b.side as Side, b.amount);
    if (credit && credit > 0) add(b.userId, credit);
  }

  // 原子結算：入帳 + 台帳 + 置 payoutSettled = true
  try {
    await prisma.$transaction(async (tx) => {
      for (const [uid, amt] of creditMap.entries()) {
        await tx.user.update({ where: { id: uid }, data: { balance: { increment: amt } } });
        await tx.ledger.create({
          data: { userId: uid, type: "PAYOUT", target: "WALLET", amount: amt, note: `Baccarat R${round.roundNo} settlement` },
        });
      }
      await tx.baccaratRound.update({ where: { id: round.id }, data: { payoutSettled: true } });
    });
  } catch {
    return noStoreJson({ error: "SETTLE_FAILED" }, 500);
  }

  const totalPaid = Array.from(creditMap.values()).reduce((a, b) => a + b, 0);
  return noStoreJson({ ok: true, round: { room: round.room, roundNo: round.roundNo }, settledUsers: creditMap.size, totalPaid, super6Applied: !!round.usedNoCommission });
}
