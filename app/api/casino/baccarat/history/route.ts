import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getUserId(req: Request) {
  return req.headers.get("x-user-id") || "demo-user";
}

export async function GET(req: Request) {
  try {
    const userId = getUserId(req);
    const { searchParams } = new URL(req.url);
    const room = (searchParams.get("room") || "R30") as "R30"|"R60"|"R90";
    const take = Number(searchParams.get("take") || 10);

    // 近 10 局回合
    const rounds = await prisma.round.findMany({
      where: { room },
      orderBy: { startedAt: "desc" },
      take,
      select: { id: true, seq: true, startedAt: true, endedAt: true, resultJson: true }
    });

    // 該使用者在這些局的下注
    const roundIds = rounds.map(r => r.id);
    const bets = await prisma.bet.findMany({
      where: { userId, roundId: { in: roundIds } },
      orderBy: { createdAt: "asc" },
    });

    // 該使用者在這些局的派彩（Ledger）
    const ledgers = await prisma.ledger.findMany({
      where: { userId, roundId: { in: roundIds }, type: "PAYOUT" },
      orderBy: { createdAt: "asc" },
    });

    const map: Record<string, any> = {};
    for (const r of rounds) {
      map[r.id] = {
        roundId: r.id,
        seq: r.seq,
        startedAt: r.startedAt,
        endedAt: r.endedAt,
        resultJson: r.resultJson,
        bets: [] as any[],
        payouts: [] as any[],
      };
    }
    for (const b of bets) map[b.roundId]?.bets.push(b);
    for (const l of ledgers) map[l.roundId!]?.payouts.push(l);

    return NextResponse.json({ items: Object.values(map) });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "UNKNOWN_ERROR" }, { status: 500 });
  }
}
