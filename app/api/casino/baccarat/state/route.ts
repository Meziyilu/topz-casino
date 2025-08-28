// app/api/casino/baccarat/state/route.ts
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyJWT } from "@/lib/jwt";
import { Prisma } from "@prisma/client";

type Phase = "BETTING" | "REVEAL" | "SETTLED";
const REVEAL_SECONDS = 6;

// ========= Taipei day window (UTC基準) =========
function getTaipeiDayWindow(date = new Date()) {
  const ms = date.getTime() + 8 * 3600 * 1000; // 轉到台北當地時間的UTC表示
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const dd = d.getUTCDate();
  const startUtc = new Date(Date.UTC(y, m, dd) - 8 * 3600 * 1000);
  const endUtc = new Date(startUtc.getTime() + 24 * 3600 * 1000);
  return { startUtc, endUtc };
}

// ========= 發牌 / 點數 =========
function baccaratValue(rank: number) {
  if (rank === 1) return 1;
  if (rank >= 2 && rank <= 9) return rank;
  return 0;
}
function totalOf(cards: { rank: number; suit: number }[]) {
  return cards.reduce((a, c) => a + baccaratValue(c.rank), 0) % 10;
}
function drawCard() {
  const rank = Math.floor(Math.random() * 13) + 1;
  const suit = Math.floor(Math.random() * 4);
  return { rank, suit };
}
function dealBaccarat() {
  const p = [drawCard(), drawCard()];
  const b = [drawCard(), drawCard()];
  const p0 = totalOf(p), b0 = totalOf(b);
  const natural = p0 >= 8 || b0 >= 8;

  if (!natural) {
    let pThird = false;
    if (p0 <= 5) { p.push(drawCard()); pThird = true; }
    const bNow = totalOf(b);
    if (!pThird) {
      if (bNow <= 5) b.push(drawCard());
    } else {
      const pt3 = p[2].rank;
      const drawB =
        (bNow <= 2) ||
        (bNow === 3 && pt3 !== 8) ||
        (bNow === 4 && (pt3 >= 2 && pt3 <= 7)) ||
        (bNow === 5 && (pt3 >= 4 && pt3 <= 7)) ||
        (bNow === 6 && (pt3 === 6 || pt3 === 7));
      if (drawB) b.push(drawCard());
    }
  }

  const pt = totalOf(p), bt = totalOf(b);
  const outcome = pt > bt ? "PLAYER" : pt < bt ? "BANKER" : "TIE";
  const playerPair = p[0].rank === p[1].rank;
  const bankerPair = b[0].rank === b[1].rank;
  const anyPair = playerPair || bankerPair;
  const perfectPair =
    (playerPair && p[0].suit === p[1].suit) ||
    (bankerPair && b[0].suit === b[1].suit);

  return { playerCards: p, bankerCards: b, playerTotal: pt, bankerTotal: bt, outcome, playerPair, bankerPair, anyPair, perfectPair };
}
function payoutFactor(
  side: string,
  outcome: string,
  f: { playerPair?: boolean; bankerPair?: boolean; anyPair?: boolean; perfectPair?: boolean }
) {
  switch (side) {
    case "PLAYER":       return outcome === "PLAYER" ? 2.0 : (outcome === "TIE" ? 1.0 : 0);
    case "BANKER":       return outcome === "BANKER" ? 1.95 : (outcome === "TIE" ? 1.0 : 0); // 5% 抽水
    case "TIE":          return outcome === "TIE" ? 9.0 : 0;
    case "PLAYER_PAIR":  return f.playerPair ? 12.0 : 0;
    case "BANKER_PAIR":  return f.bankerPair ? 12.0 : 0;
    case "ANY_PAIR":     return f.anyPair ? 6.0 : 0;
    case "PERFECT_PAIR": return f.perfectPair ? 26.0 : 0;
    default:             return 0;
  }
}

// ========= 派彩（只跑一次） =========
async function settleRound(tx: Prisma.TransactionClient, roundId: string) {
  const r = await tx.round.findUnique({ where: { id: roundId } });
  if (!r || r.settledAt || !r.outcome) return;

  const flags = {
    playerPair: !!r.playerPair,
    bankerPair: !!r.bankerPair,
    anyPair: !!r.anyPair,
    perfectPair: !!r.perfectPair,
  };

  const bets = await tx.bet.findMany({
    where: { roundId: r.id },
    select: { userId: true, side: true, amount: true },
  });

  for (const b of bets) {
    const factor = payoutFactor(b.side as any, String(r.outcome), flags);
    if (factor <= 0) continue;
    const credit = Math.floor(b.amount * factor);

    const updated = await tx.user.update({
      where: { id: b.userId },
      data: { balance: { increment: credit } },
      select: { balance: true, bankBalance: true },
    });

    await tx.ledger.create({
      data: {
        userId: b.userId,
        type: "BET_PAYOUT",
        target: "WALLET",
        delta: credit,
        memo: `派彩 ${b.side} (round #${r.roundSeq})`,
        balanceAfter: updated.balance,
        bankAfter: updated.bankBalance,
      },
    });
  }

  await tx.round.update({
    where: { id: r.id },
    data: { settledAt: new Date(), phase: "SETTLED" },
  });
}

// ========= 今日(台北)下一局 =========
async function createNextRoundDaily(tx: Prisma.TransactionClient, roomId: string) {
  const { startUtc, endUtc } = getTaipeiDayWindow(new Date());
  const latestToday = await tx.round.findFirst({
    where: { roomId, startedAt: { gte: startUtc, lt: endUtc } },
    orderBy: [{ roundSeq: "desc" }],
    select: { roundSeq: true },
  });
  const nextSeq = latestToday?.roundSeq ? latestToday.roundSeq + 1 : 1;

  return tx.round.create({
    data: {
      roomId,
      roundSeq: nextSeq,
      phase: "BETTING",
      createdAt: new Date(),
      startedAt: new Date(),
    } as any,
  });
}

function jsonNoStore(payload: any, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      "Pragma": "no-cache",
      "Expires": "0",
    },
  });
}

// ========= Handler =========
export async function GET(req: NextRequest) {
  try {
    const roomCode = String(req.nextUrl.searchParams.get("room") || "R60").toUpperCase();
    const room = await prisma.room.findFirst({ where: { code: roomCode as any } });
    if (!room) return jsonNoStore({ error: "房間不存在" }, 404);

    const { startUtc, endUtc } = getTaipeiDayWindow(new Date());

    let round = await prisma.round.findFirst({
      where: { roomId: room.id, startedAt: { gte: startUtc, lt: endUtc } },
      orderBy: [{ roundSeq: "desc" }],
    });
    if (!round) {
      round = await prisma.round.create({
        data: { roomId: room.id, roundSeq: 1, phase: "BETTING", createdAt: new Date(), startedAt: new Date() } as any,
      });
    }

    const base = new Date((round as any).startedAt || round.createdAt || new Date());
    const betSecs = room.durationSeconds;
    const elapsed = Math.floor((Date.now() - base.getTime()) / 1000);

    let phase: Phase;
    let secLeft: number;

    if (elapsed < betSecs) {
      phase = "BETTING";
      secLeft = betSecs - elapsed;
      if (round.phase !== "BETTING") {
        await prisma.round.update({ where: { id: round.id }, data: { phase: "BETTING" } });
        round = { ...round, phase: "BETTING" } as any;
      }
    } else if (elapsed < betSecs + REVEAL_SECONDS) {
      phase = "REVEAL";
      secLeft = betSecs + REVEAL_SECONDS - elapsed;

      if (!round.outcome) {
        await prisma.$transaction(async (tx) => {
          const fresh = await tx.round.findUnique({ where: { id: round!.id } });
          if (fresh && !fresh.outcome) {
            const dealt = dealBaccarat();
            await tx.round.update({
              where: { id: fresh.id },
              data: {
                playerCards: dealt.playerCards as any,
                bankerCards: dealt.bankerCards as any,
                playerTotal: dealt.playerTotal,
                bankerTotal: dealt.bankerTotal,
                outcome: dealt.outcome as any,
                playerPair: dealt.playerPair,
                bankerPair: dealt.bankerPair,
                anyPair: dealt.anyPair,
                perfectPair: dealt.perfectPair,
                phase: "REVEAL",
              } as any,
            });
          }
        });
        round = (await prisma.round.findUnique({ where: { id: round.id } })) as any;
      } else if (round.phase !== "REVEAL") {
        await prisma.round.update({ where: { id: round.id }, data: { phase: "REVEAL" } });
        round = { ...round, phase: "REVEAL" } as any;
      }
    } else {
      phase = "SETTLED";
      secLeft = 0;

      if (!round.settledAt && round.outcome) {
        await prisma.$transaction(async (tx) => {
          const fresh = await tx.round.findUnique({ where: { id: round!.id } });
          if (fresh && !fresh.settledAt && fresh.outcome) {
            await settleRound(tx as Prisma.TransactionClient, fresh.id);
          }
        });
        round = (await prisma.round.findUnique({ where: { id: round.id } })) as any;
      }

      const hasNext = await prisma.round.findFirst({
        where: {
          roomId: room.id,
          startedAt: { gte: startUtc, lt: endUtc },
          roundSeq: { gt: round.roundSeq },
        },
        select: { id: true },
      });
      if (!hasNext) {
        await prisma.$transaction(async (tx) => {
          await createNextRoundDaily(tx as Prisma.TransactionClient, room.id);
        });
      }
    }

    const recentRows = await prisma.round.findMany({
      where: { roomId: room.id, startedAt: { gte: startUtc, lt: endUtc }, outcome: { not: null } },
      orderBy: [{ roundSeq: "desc" }],
      take: 10,
      select: { roundSeq: true, outcome: true, playerTotal: true, bankerTotal: true },
    });
    const recentList = recentRows.map((rc) => ({
      roundSeq: rc.roundSeq,
      outcome: rc.outcome,
      p: rc.playerTotal ?? 0,
      b: rc.bankerTotal ?? 0,
    }));

    let myBets: Record<string, number> = {};
    try {
      const token = req.cookies.get("token")?.value;
      if (token) {
        const payload = await verifyJWT(token);
        const userId = String(payload.sub);
        const bets = await prisma.bet.groupBy({
          by: ["side"],
          where: { roundId: round.id, userId },
          _sum: { amount: true },
        });
        const agg: Record<string, number> = {};
        for (const gb of bets) agg[gb.side] = gb._sum.amount ?? 0;
        myBets = agg;
      }
    } catch {}

    const payload = {
      room: { code: room.code, name: room.name, durationSeconds: room.durationSeconds },
      roundSeq: round.roundSeq,
      phase,
      secLeft,
      result: round.outcome
        ? {
            playerCards: (round.playerCards as any) || [],
            bankerCards: (round.bankerCards as any) || [],
            playerTotal: round.playerTotal ?? 0,
            bankerTotal: round.bankerTotal ?? 0,
            outcome: round.outcome,
            playerPair: !!round.playerPair,
            bankerPair: !!round.bankerPair,
            anyPair: !!round.anyPair,
            perfectPair: !!round.perfectPair,
          }
        : null,
      myBets,
      recent: recentList,
    };

    return jsonNoStore(payload);
  } catch (e: any) {
    return jsonNoStore({ error: e?.message || "Server error" }, 500);
  }
}
