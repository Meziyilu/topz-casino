import { NextRequest, NextResponse } from "next/server";
import { phaseAt, roundNumberAt, dealFromSeed, recentRounds, type RoomSec } from "@/lib/baccarat";
import prisma from "@/lib/prisma";
import { verifyJWT } from "@/lib/jwt";

export const runtime = "nodejs";

function parseRoomSec(req: NextRequest): RoomSec {
  const r = Number(new URL(req.url).searchParams.get("room") || "60");
  return (r === 30 || r === 60 || r === 90) ? r : 60;
}

export async function GET(req: NextRequest) {
  try {
    const roomSec = parseRoomSec(req);
    const now = new Date();
    const round = roundNumberAt(now, roomSec);
    const { phase, secLeft } = phaseAt(now, roomSec);

    // user (optional)
    const token = req.cookies.get("token")?.value;
    let userId: string | null = null;
    if (token) {
      try { userId = String((await verifyJWT(token)).sub); } catch {}
    }

    // my bets for this round & room
    let myBets: Record<string, number> = {};
    if (userId) {
      const rows = await prisma.bet.groupBy({
        by: ["side"],
        _sum: { amount: true },
        where: { userId, round, roomSec }
      });
      rows.forEach(r => { (myBets as any)[r.side] = r._sum.amount ?? 0; });
    }

    // reveal result if not betting
    const result = phase === "BETTING" ? null : dealFromSeed(round, roomSec);

    // recent outcomes (last 24 for路子)
    const rec = recentRounds(24, now, roomSec).map(r => {
      const d = dealFromSeed(r, roomSec);
      return { round: r, outcome: d.outcome, p: d.playerTotal, b: d.bankerTotal };
    });

    return NextResponse.json({ roomSec, round, phase, secLeft, result, myBets, recent: rec, serverTime: Date.now() });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Bad Request" }, { status: 400 });
  }
}
