import { NextRequest, NextResponse } from "next/server";
import { phaseAt, roundNumberAt, dealFromSeed, recentRounds, nowTaipei } from "@/lib/baccarat";
import prisma from "@/lib/prisma";
import { verifyJWT } from "@/lib/jwt";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const date = nowTaipei();
    const round = roundNumberAt(date);
    const { phase, secLeft } = phaseAt(date);

    // user (optional)
    const token = req.cookies.get("token")?.value;
    let userId: string | null = null;
    if (token) {
      try {
        const payload = await verifyJWT(token);
        userId = String(payload.sub);
      } catch {}
    }

    // my bets for this round
    let myBets: Record<string, number> = {};
    if (userId) {
      const rows = await prisma.bet.groupBy({
        by: ["side"],
        _sum: { amount: true },
        where: { userId, round }
      });
      rows.forEach(r => {
        (myBets as any)[r.side] = r._sum.amount ?? 0;
      });
    }

    // reveal result if phase !== BETTING
    const result = phase === "BETTING" ? null : dealFromSeed(round);

    // recent outcomes (last 10)
    const rec = recentRounds(10, date).map(r => {
      const d = dealFromSeed(r);
      return { round: r, outcome: d.outcome, p: d.playerTotal, b: d.bankerTotal };
    });

    return NextResponse.json({
      round,
      phase,
      secLeft,
      result,
      myBets,
      recent: rec
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Bad Request" }, { status: 400 });
  }
}
