import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";
import type { RoomKey } from "@/lib/sicbo/types";
import { ensureRooms, getRoomConfig, getRoomState } from "@/lib/sicbo/room";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  const body = await req.json().catch(() => null) as any;
  const room = (body?.room || "R60") as RoomKey;
  const bets = Array.isArray(body?.bets) ? body.bets : [];
  if (!bets.length) return NextResponse.json({ error: "NO_BETS" }, { status: 400 });

  await ensureRooms();
  const s = getRoomState(room);
  const cfg = getRoomConfig(room);
  if (!s || !cfg) return NextResponse.json({ error: "ROOM_NOT_READY" }, { status: 503 });
  if (s.phase !== "BETTING") return NextResponse.json({ error: "NOT_IN_BETTING" }, { status: 409 });

  const me = await prisma.user.findUnique({ where: { id: userId }, select: { balance: true } });
  if (!me) return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 });

  let total = 0;
  for (const b of bets) {
    if (!b?.amount || b.amount < cfg.limits.minBet) return NextResponse.json({ error:"UNDER_MIN" }, { status: 400 });
    if (b.amount > cfg.limits.maxBet) return NextResponse.json({ error:"OVER_MAX" }, { status: 400 });
    total += b.amount;
  }
  if (total > cfg.limits.perRoundMax) return NextResponse.json({ error:"OVER_ROUND_LIMIT" }, { status: 400 });
  if (me.balance < total) return NextResponse.json({ error:"INSUFFICIENT_BALANCE" }, { status: 402 });

  const tx = await prisma.$transaction(async (tx) => {
    await tx.ledger.create({
      data: { type: "BET_PLACED", game: "SICBO", gameRef: s.roundId!, userId, amount: -total }
    });
    await tx.user.update({ where: { id: userId }, data: { balance: { decrement: total } } });

    const mapped = bets.map((b: any) => {
      const p = cfg.payout;
      const base: any = { userId, roundId: s.roundId!, amount: b.amount, odds: 1 };
      if (b.kind==="BIG_SMALL") return { ...base, kind:"BIG_SMALL", bigSmall:b.bigSmall, odds: Number(p.bigSmall?.[b.bigSmall] ?? 1) };
      if (b.kind==="TOTAL")     return { ...base, kind:"TOTAL", totalSum:b.totalSum, odds: Number(p.total?.[b.totalSum] ?? 0) };
      if (b.kind==="SINGLE_FACE") return { ...base, kind:"SINGLE_FACE", face:b.face, odds: 1 };
      if (b.kind==="DOUBLE_FACE") return { ...base, kind:"DOUBLE_FACE", face:b.face, odds: Number(p.doubleFace ?? 8) };
      if (b.kind==="ANY_TRIPLE")  return { ...base, kind:"ANY_TRIPLE", odds: Number(p.anyTriple ?? 24) };
      if (b.kind==="SPECIFIC_TRIPLE") return { ...base, kind:"SPECIFIC_TRIPLE", face:b.face, odds: Number(p.specificTriple ?? 150) };
      if (b.kind==="TWO_DICE_COMBO")  return { ...base, kind:"TWO_DICE_COMBO", faceA:Math.min(b.faceA,b.faceB), faceB:Math.max(b.faceA,b.faceB), odds:Number(p.twoDiceCombo ?? 5) };
      return base;
    });

    await tx.sicboBet.createMany({ data: mapped });
    return { created: mapped.length, debited: total };
  });

  return NextResponse.json({ ok: true, ...tx });
}
