import { NextRequest, NextResponse } from "next/server";
import type { BetSide, LedgerType, RoomCode } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getRoomInfo } from "@/services/baccarat.service";
import { dealBaccarat } from "@/lib/baccarat-deal"; // 若沒獨立檔，請把那段貼到此檔上方

export const dynamic = "force-dynamic";

const ODDS: Record<BetSide, number> = {
  PLAYER: 1,
  BANKER: 1,               // （你要 6點半賠就自行調整）
  TIE: 8,
  PLAYER_PAIR: 11,
  BANKER_PAIR: 11,
  ANY_PAIR: 5,
  PERFECT_PAIR: 25,
  BANKER_SUPER_SIX: 12,    // 只有 outcome= BANKER 且點數=6 才算
};

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const room = (url.searchParams.get("room") || "R60").toUpperCase() as RoomCode;

  const cur = await prisma.round.findFirst({ where:{ room }, orderBy:{ startedAt:"desc" } });
  if (!cur) return NextResponse.json({ ok:false, error:"NO_ROUND" }, { status:400 });
  if (cur.phase === "SETTLED") return NextResponse.json({ ok:true, note:"ALREADY_SETTLED", roundId: cur.id });

  // 用回合 id 決定牌、點數、對子、超6
  const sim = dealBaccarat(cur.id);
  const outcome = sim.outcome;

  // 撈本局所有下注
  const bets = await prisma.bet.findMany({ where:{ roundId: cur.id } });

  // 聚合派彩
  const userPayout: Record<string, number> = {};
  for (const b of bets) {
    let eligible = false;

    if (b.side === "PLAYER" && outcome === "PLAYER") eligible = true;
    else if (b.side === "BANKER" && outcome === "BANKER") eligible = true;
    else if (b.side === "TIE" && outcome === "TIE") eligible = true;
    else if (b.side === "PLAYER_PAIR" && sim.flags.playerPair) eligible = true;
    else if (b.side === "BANKER_PAIR" && sim.flags.bankerPair) eligible = true;
    else if (b.side === "ANY_PAIR" && sim.flags.anyPair) eligible = true;
    else if (b.side === "PERFECT_PAIR" && sim.flags.perfectPair) eligible = true;
    else if (b.side === "BANKER_SUPER_SIX" && sim.flags.super6) eligible = true;

    const payout = eligible ? Math.floor(b.amount * (ODDS[b.side] ?? 0)) : 0;
    if (payout > 0) userPayout[b.userId] = (userPayout[b.userId] ?? 0) + payout;
  }

  // 交易：更新回合、派彩入帳、寫 ledger
  await prisma.$transaction(async (tx) => {
    await tx.round.update({ where:{ id: cur.id }, data:{ phase:"SETTLED", outcome } });

    for (const [uid, inc] of Object.entries(userPayout)) {
      await tx.user.update({ where:{ id: uid }, data:{ balance: { increment: inc } } });
      await tx.ledger.create({
        data: { userId: uid, type: "PAYOUT" as LedgerType, target: "WALLET", amount: inc },
      });
    }
  });

  // 立刻開下一局
  const rc = await getRoomInfo(room);
  const next = await prisma.round.create({ data:{ room, phase:"BETTING", startedAt: new Date() } });

  return NextResponse.json({
    ok:true,
    settled: { roundId: cur.id, outcome, p: sim.pPts, b: sim.bPts, flags: sim.flags },
    next: { roundId: next.id, secondsPerRound: rc.secondsPerRound },
  });
}
