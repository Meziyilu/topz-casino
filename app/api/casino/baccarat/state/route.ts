// app/api/casino/baccarat/state/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyJWT } from "@/lib/jwt";
import { Prisma } from "@prisma/client";

type Phase = "BETTING" | "REVEAL" | "SETTLED";

// 可調
const REVEAL_SECONDS = 6;

function now() { return new Date(); }
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
  const pTot0 = totalOf(p), bTot0 = totalOf(b);
  const natural = pTot0 >= 8 || bTot0 >= 8;
  if (!natural) {
    let pThird = false;
    if (pTot0 <= 5) { p.push(drawCard()); pThird = true; }
    const bTot = totalOf(b);
    if (!pThird) {
      if (bTot <= 5) b.push(drawCard());
    } else {
      const pt3 = p[2].rank;
      const should =
        (bTot <= 2) ||
        (bTot === 3 && pt3 !== 8) ||
        (bTot === 4 && pt3 >= 2 && pt3 <= 7) ||
        (bTot === 5 && pt3 >= 4 && pt3 <= 7) ||
        (bTot === 6 && (pt3 === 6 || pt3 === 7));
      if (should) b.push(drawCard());
    }
  }
  const pt = totalOf(p), bt = totalOf(b);
  const outcome = pt > bt ? "PLAYER" : pt < bt ? "BANKER" : "TIE";
  const playerPair = p[0].rank === p[1].rank;
  const bankerPair = b[0].rank === b[1].rank;
  const anyPair = playerPair || bankerPair;
  const perfectPair = (playerPair && p[0].suit === p[1].suit) || (bankerPair && b[0].suit === b[1].suit);
  return { playerCards: p, bankerCards: b, playerTotal: pt, bankerTotal: bt, outcome, playerPair, bankerPair, anyPair, perfectPair };
}
function payoutFactor(side: string, outcome: string, f: { playerPair?: boolean; bankerPair?: boolean; anyPair?: boolean; perfectPair?: boolean }) {
  switch (side) {
    case "PLAYER": return outcome === "PLAYER" ? 2.0 : (outcome === "TIE" ? 1.0 : 0);
    case "BANKER": return outcome === "BANKER" ? 1.95 : (outcome === "TIE" ? 1.0 : 0);
    case "TIE": return outcome === "TIE" ? 9.0 : 0;
    case "PLAYER_PAIR": return f.playerPair ? 12.0 : 0;
    case "BANKER_PAIR": return f.bankerPair ? 12.0 : 0;
    case "ANY_PAIR": return f.anyPair ? 6.0 : 0;
    case "PERFECT_PAIR": return f.perfectPair ? 26.0 : 0;
    default: return 0;
  }
}

async function settleRound(tx: Prisma.TransactionClient, roundId: string) {
  const r = await tx.round.findUnique({ where: { id: roundId } });
  if (!r) throw new Error("回合不存在");
  if (r.settledAt) return;
  if (!r.outcome) return; // 沒結果無法結算

  const flags = { playerPair: !!r.playerPair, bankerPair: !!r.bankerPair, anyPair: !!r.anyPair, perfectPair: !!r.perfectPair };
  const bets = await tx.bet.findMany({ where: { roundId: r.id }, select: { userId: true, side: true, amount: true } });

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
  await tx.round.update({ where: { id: r.id }, data: { settledAt: new Date(), phase: "SETTLED" } });
}

export async function GET(req: NextRequest) {
  try {
    const roomCode = String(req.nextUrl.searchParams.get("room") || "R60").toUpperCase();

    // 1) 房間（code 是 enum，轉型）
    const room = await prisma.room.findFirst({ where: { code: roomCode as any } });
    if (!room) return NextResponse.json({ error: "房間不存在" }, { status: 404 });

    // 2) 取得該房最新回合（不再用 day 過濾，避免格式不一致找不到）
    let round = await prisma.round.findFirst({
      where: { roomId: room.id },
      orderBy: [{ createdAt: "desc" }, { roundSeq: "desc" }],
    });

    // 沒有就開第 1 局
    if (!round) {
      round = await prisma.round.create({
        data: { roomId: room.id, roundSeq: 1, phase: "BETTING", createdAt: new Date() } as any,
      });
    }

    // 若 roundSeq 為 0 或 null，補正為該房目前最大 + 1
    if (!round.roundSeq || round.roundSeq < 1) {
      const maxSeq = await prisma.round.aggregate({
        where: { roomId: room.id },
        _max: { roundSeq: true },
      });
      const nextSeq = (maxSeq._max.roundSeq || 0) + 1;
      round = await prisma.round.update({ where: { id: round.id }, data: { roundSeq: nextSeq } });
    }

    // 若 createdAt 為空（某些舊資料），補上現在
    if (!round.createdAt) {
      round = await prisma.round.update({ where: { id: round.id }, data: { createdAt: new Date() } });
    }

    const betSecs = room.durationSeconds;
    const base = new Date(round.createdAt!);
    const elapsed = Math.floor((now().getTime() - base.getTime()) / 1000);

    // 3) 計算目前 phase & secLeft
    let phase: Phase;
    let secLeft: number;
    if (elapsed < betSecs) {
      phase = "BETTING";
      secLeft = betSecs - elapsed;
      // 若 DB phase 不一致，寫回
      if (round.phase !== "BETTING") {
        await prisma.round.update({ where: { id: round.id }, data: { phase: "BETTING" } });
        round = { ...round, phase: "BETTING" } as any;
      }
    } else if (elapsed < betSecs + REVEAL_SECONDS) {
      phase = "REVEAL";
      secLeft = betSecs + REVEAL_SECONDS - elapsed;
      // 進 REVEAL：沒有結果就立即發牌寫回
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
        round = await prisma.round.findUnique({ where: { id: round.id } }) as any;
      } else if (round.phase !== "REVEAL") {
        await prisma.round.update({ where: { id: round.id }, data: { phase: "REVEAL" } });
        round = { ...round, phase: "REVEAL" } as any;
      }
    } else {
      phase = "SETTLED";
      secLeft = 0;

      // 結算（只跑一次）
      if (!round.settledAt && round.outcome) {
        await prisma.$transaction(async (tx) => {
          const fresh = await tx.round.findUnique({ where: { id: round!.id } });
          if (fresh && !fresh.settledAt && fresh.outcome) {
            await settleRound(tx as Prisma.TransactionClient, fresh.id);
          }
        });
        round = await prisma.round.findUnique({ where: { id: round.id } }) as any;
      }

      // 自動開下一局（若沒有更大的 roundSeq）
      const newer = await prisma.round.findFirst({
        where: { roomId: room.id, roundSeq: { gt: round.roundSeq } },
        select: { id: true },
      });
      if (!newer) {
        await prisma.round.create({
          data: { roomId: room.id, roundSeq: round.roundSeq + 1, phase: "BETTING", createdAt: new Date() } as any,
        });
      }
    }

    // 近 10 局作路子（不限制 day）
    const recentRows = await prisma.round.findMany({
      where: { roomId: room.id, outcome: { not: null } },
      orderBy: [{ createdAt: "desc" }],
      take: 10,
      select: { roundSeq: true, outcome: true, playerTotal: true, bankerTotal: true },
    });
    const recentList = recentRows.map((rc) => ({
      roundSeq: rc.roundSeq,
      outcome: rc.outcome,
      p: rc.playerTotal ?? 0,
      b: rc.bankerTotal ?? 0,
    }));

    // 我的下注合計（若登入）
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
    } catch { /* 未登入就空物件 */ }

    return NextResponse.json({
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
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
