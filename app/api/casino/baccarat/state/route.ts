// app/api/casino/baccarat/state/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyJWT } from "@/lib/jwt";
import { Prisma } from "@prisma/client";

type Phase = "BETTING" | "REVEAL" | "SETTLED";

// ====== 可調參數 ======
const REVEAL_SECONDS = 6; // 開牌動畫 / 揭示秒數

// ====== 小工具：時間/點數/發牌 ======
function now() { return new Date(); }
function toTaipeiDateString(d = new Date()) {
  // 依你之前的需求：每天重置局數（以台北時區）
  const tz = 'Asia/Taipei';
  const yyyy = d.toLocaleDateString('zh-TW', { timeZone: tz, year: 'numeric' });
  const mm = d.toLocaleDateString('zh-TW', { timeZone: tz, month: '2-digit' });
  const dd = d.toLocaleDateString('zh-TW', { timeZone: tz, day: '2-digit' });
  return `${yyyy}-${mm}-${dd}`;
}
function baccaratValue(rank: number) {
  if (rank === 1) return 1;
  if (rank >= 2 && rank <= 9) return rank;
  return 0;
}
function totalOf(cards: { rank: number; suit: number }[]) {
  return cards.reduce((a, c) => a + baccaratValue(c.rank), 0) % 10;
}
function drawCard() {
  // rank: 1~13(A~K), suit: 0♠,1♥,2♦,3♣
  const rank = Math.floor(Math.random() * 13) + 1;
  const suit = Math.floor(Math.random() * 4);
  return { rank, suit };
}
function dealBaccarat() {
  // 簡化牌局（不洗去重）：2+2 基本牌，依百家規則可能補第3張
  const p: { rank: number; suit: number }[] = [drawCard(), drawCard()];
  const b: { rank: number; suit: number }[] = [drawCard(), drawCard()];

  const pTot = totalOf(p);
  const bTot = totalOf(b);

  // 自然牌：任一方 8/9 就不補牌
  const natural = (pTot >= 8 || bTot >= 8);

  let pThird = false;
  let bThird = false;

  if (!natural) {
    // 閒先判：總點 <= 5 補一張
    if (pTot <= 5) {
      p.push(drawCard());
      pThird = true;
    }
    // 莊補牌規則（依據閒第三張 / 莊目前點數）
    const currentBTot = totalOf(b);
    if (!pThird) {
      // 閒未補第三張 → 莊點數 <=5 就補一張
      if (currentBTot <= 5) {
        b.push(drawCard());
        bThird = true;
      }
    } else {
      // 閒有第三張 → 依標準表（簡化版）
      const pt3 = p[2].rank;
      const b0 = currentBTot;
      const shouldBankerDraw =
        (b0 <= 2) ||
        (b0 === 3 && pt3 !== 8) ||
        (b0 === 4 && (pt3 >= 2 && pt3 <= 7)) ||
        (b0 === 5 && (pt3 >= 4 && pt3 <= 7)) ||
        (b0 === 6 && (pt3 === 6 || pt3 === 7));
      if (shouldBankerDraw) {
        b.push(drawCard());
        bThird = true;
      }
    }
  }

  const finalPT = totalOf(p);
  const finalBT = totalOf(b);
  const outcome = finalPT > finalBT ? "PLAYER" : (finalPT < finalBT ? "BANKER" : "TIE");

  const playerPair = (p[0].rank === p[1].rank);
  const bankerPair = (b[0].rank === b[1].rank);
  const anyPair = playerPair || bankerPair;
  const perfectPair =
    (playerPair && p[0].suit === p[1].suit) ||
    (bankerPair && b[0].suit === b[1].suit);

  return {
    playerCards: p,
    bankerCards: b,
    playerTotal: finalPT,
    bankerTotal: finalBT,
    outcome,
    playerPair,
    bankerPair,
    anyPair,
    perfectPair,
  };
}

function payoutFactor(
  side: string,
  outcome: string,
  flags: { playerPair?: boolean; bankerPair?: boolean; anyPair?: boolean; perfectPair?: boolean }
) {
  switch (side) {
    case "PLAYER":       return outcome === "PLAYER" ? 2.0 : (outcome === "TIE" ? 1.0 : 0);
    case "BANKER":       return outcome === "BANKER" ? 1.95 : (outcome === "TIE" ? 1.0 : 0);
    case "TIE":          return outcome === "TIE" ? 9.0 : 0;
    case "PLAYER_PAIR":  return flags.playerPair ? 12.0 : 0;
    case "BANKER_PAIR":  return flags.bankerPair ? 12.0 : 0;
    case "ANY_PAIR":     return flags.anyPair ? 6.0 : 0;
    case "PERFECT_PAIR": return flags.perfectPair ? 26.0 : 0;
    default:             return 0;
  }
}

// 結算：派彩 + 標記 SETTLED（防重入）
async function settleRound(tx: Prisma.TransactionClient, roundId: string) {
  const r = await tx.round.findUnique({ where: { id: roundId } });
  if (!r) throw new Error("回合不存在");
  if (r.settledAt) return;

  const flags = {
    playerPair: !!r.playerPair,
    bankerPair: !!r.bankerPair,
    anyPair: !!r.anyPair,
    perfectPair: !!r.perfectPair,
  };

  const bets = await tx.bet.findMany({
    where: { roundId: r.id },
    select: { id: true, userId: true, side: true, amount: true }
  });

  for (const b of bets) {
    const factor = payoutFactor(b.side as any, String(r.outcome), flags);
    if (factor <= 0) continue; // 輸：下注時已扣

    const credit = Math.floor(b.amount * factor);
    const updated = await tx.user.update({
      where: { id: b.userId },
      data: { balance: { increment: credit } },
      select: { balance: true, bankBalance: true }
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
      }
    });
  }

  await tx.round.update({
    where: { id: r.id },
    data: { settledAt: new Date(), phase: "SETTLED" }
  });
}

// 產生下一局（同一房、同一天，roundSeq+1）
async function createNextRound(tx: Prisma.TransactionClient, roomId: string) {
  const today = toTaipeiDateString();
  const last = await tx.round.findFirst({
    where: { roomId, day: today },
    orderBy: { roundSeq: "desc" }
  });
  const nextSeq = last ? last.roundSeq + 1 : 1;
  return tx.round.create({
    data: {
      roomId,
      day: today,
      roundSeq: nextSeq,
      phase: "BETTING",          // 從下注期開始
      // createdAt 由 DB now() 自動填
    } as any
  });
}

export async function GET(req: NextRequest) {
  try {
    const roomCode = String(req.nextUrl.searchParams.get("room") || "R60").toUpperCase();

    // 1) 房間（code 是 Enum → cast）
    const room = await prisma.room.findFirst({ where: { code: roomCode as any } });
    if (!room) return NextResponse.json({ error: "房間不存在" }, { status: 404 });

    const today = toTaipeiDateString();

    // 2) 取得「今天」這個房間的最新回合，沒有就建一局
    let round = await prisma.round.findFirst({
      where: { roomId: room.id, day: today },
      orderBy: { roundSeq: "desc" }
    });

    if (!round) {
      round = await prisma.round.create({
        data: { roomId: room.id, day: today, roundSeq: 1, phase: "BETTING" } as any
      });
    }

    // 3) 計算相位與倒數（以 createdAt 當時鐘起點）
    const base = new Date(round.createdAt || now());
    const betSecs = room.durationSeconds;
    const revealSecs = REVEAL_SECONDS;
    const t = Math.floor((now().getTime() - base.getTime()) / 1000);

    let phase: Phase;
    let secLeft: number;

    if (t < betSecs) {
      phase = "BETTING";
      secLeft = betSecs - t;
    } else if (t < betSecs + revealSecs) {
      phase = "REVEAL";
      secLeft = betSecs + revealSecs - t;
    } else {
      phase = "SETTLED";
      secLeft = 0;
    }

    // 4) 若進入 REVEAL 且尚未有結果 → 立即「發牌&存結果」
    if (phase === "REVEAL" && !round.outcome) {
      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // 重新 load 防併發
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
              phase: "REVEAL"
            } as any
          });
        }
      });
      // 重新抓結果
      round = await prisma.round.findUnique({ where: { id: round.id } }) as any;
    }

    // 5) 若該進入 SETTLED 且尚未 settled → 自動結算（派彩）
    if (phase === "SETTLED" && !round.settledAt && round.outcome) {
      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const fresh = await tx.round.findUnique({ where: { id: round!.id } });
        if (fresh && !fresh.settledAt && fresh.outcome) {
          await settleRound(tx, fresh.id);
        }
      });
      round = await prisma.round.findUnique({ where: { id: round.id } }) as any;
    }

    // 6) 若已結算 & 本局已過，且「今天還沒有下一局的 createdAt>本局」 → 自動開新局
    if (phase === "SETTLED" && round.settledAt) {
      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const hasNewer = await tx.round.findFirst({
          where: { roomId: room.id, day: today, roundSeq: { gt: round!.roundSeq } },
          select: { id: true }
        });
        if (!hasNewer) {
          await createNextRound(tx, room.id);
        }
      });
    }

    // 7) 近10局作路子
    const recentRows = await prisma.round.findMany({
      where: { roomId: room.id, day: today, outcome: { not: null } },
      orderBy: { roundSeq: "desc" },
      take: 10,
      select: { roundSeq: true, outcome: true, playerTotal: true, bankerTotal: true }
    });

    const recentList = recentRows.map((rc) => ({
      roundSeq: rc.roundSeq,
      outcome: rc.outcome,
      p: rc.playerTotal ?? 0,
      b: rc.bankerTotal ?? 0,
    }));

    // 8) 我的下注合計（登入才查）
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
    } catch { myBets = {}; }

    // 9) 回傳
    return NextResponse.json({
      room: { code: room.code, name: room.name, durationSeconds: room.durationSeconds },
      day: round.day,
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
