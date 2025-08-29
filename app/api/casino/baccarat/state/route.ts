// app/api/casino/baccarat/state/route.ts
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import type { Prisma } from "@prisma/client";
import { dealOneRound, payoutRatio } from "@/lib/baccarat";

const asAny = <T = any>(v: unknown) => v as T;

function noStore(payload: any, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

// 台北當日 00:00（以 UTC 儲存）
function taipeiDayStart(d = new Date()) {
  const tpeMs = d.getTime() + 8 * 3600_000;
  const day0 = Math.floor(tpeMs / 86_400_000) * 86_400_000;
  return new Date(day0 - 8 * 3600_000);
}

async function createNextRoundTx(
  tx: Prisma.TransactionClient,
  roomId: string,
  dayStartUtc: Date
) {
  const latest = await tx.round.findFirst({
    where: { roomId, day: dayStartUtc },
    orderBy: { roundSeq: "desc" },
    select: { roundSeq: true },
  });
  const nextSeq = (latest?.roundSeq ?? 0) + 1;
  const now = new Date();

  return tx.round.create({
    data: {
      roomId,
      day: dayStartUtc,
      roundSeq: nextSeq,
      phase: asAny("BETTING"),
      createdAt: now,
      startedAt: now,
    },
    select: {
      id: true, roundSeq: true, phase: true, createdAt: true, startedAt: true,
      outcome: true, playerTotal: true, bankerTotal: true, playerCards: true, bankerCards: true,
    },
  });
}

async function ensureDealAtRevealTx(
  tx: Prisma.TransactionClient,
  roundId: string
) {
  const r = await tx.round.findUnique({
    where: { id: roundId },
    select: {
      id: true, phase: true, outcome: true,
      playerCards: true, bankerCards: true,
      playerTotal: true, bankerTotal: true,
      playerPair: true, bankerPair: true, anyPair: true, perfectPair: true,
    },
  });
  if (!r) return;

  // 第一次進入 REVEALING：產生一次結果並寫入 DB（之後只讀）
  if ((r.phase as any) === "REVEALING" && !r.outcome) {
    const dealt = dealOneRound();
    await tx.round.update({
      where: { id: roundId },
      data: {
        outcome: asAny(dealt.outcome),
        playerTotal: dealt.playerTotal,
        bankerTotal: dealt.bankerTotal,
        playerPair: dealt.playerPair,
        bankerPair: dealt.bankerPair,
        anyPair: dealt.anyPair,
        perfectPair: dealt.perfectPair,
        playerCards: asAny(dealt.playerCards),
        bankerCards: asAny(dealt.bankerCards),
      },
    });
  }
}

async function settleRoundTx(tx: Prisma.TransactionClient, roundId: string) {
  const r = await tx.round.findUnique({
    where: { id: roundId },
    select: {
      id: true, outcome: true, playerTotal: true, bankerTotal: true,
      playerPair: true, bankerPair: true, anyPair: true, perfectPair: true,
    },
  });
  if (!r || !r.outcome) return;

  const bets = await tx.bet.findMany({
    where: { roundId },
    select: { id: true, userId: true, side: true, amount: true },
  });

  for (const b of bets) {
    // 和局：退還莊/閒注
    if (r.outcome === asAny("TIE") && (b.side === asAny("PLAYER") || b.side === asAny("BANKER"))) {
      const afterRefund = await tx.user.update({
        where: { id: b.userId },
        data: { balance: { increment: b.amount } },
        select: { balance: true, bankBalance: true },
      });
      await tx.ledger.create({
        data: {
          userId: b.userId,
          type: asAny("PAYOUT"),
          target: asAny("WALLET"),
          delta: b.amount,
          memo: "和局退注",
          balanceAfter: afterRefund.balance,
          bankAfter: afterRefund.bankBalance,
        },
      });
      // 和局退注後仍可處理 TIE 下注的賠付（下面 payoutRatio）
    }

    const ratio = payoutRatio(asAny(b.side), {
      outcome: asAny(r.outcome),
      playerPair: !!r.playerPair,
      bankerPair: !!r.bankerPair,
    });

    if (ratio > 0) {
      const win = Math.floor(b.amount * ratio);
      const after = await tx.user.update({
        where: { id: b.userId },
        data: { balance: { increment: win } },
        select: { balance: true, bankBalance: true },
      });
      await tx.ledger.create({
        data: {
          userId: b.userId,
          type: asAny("PAYOUT"),
          target: asAny("WALLET"),
          delta: win,
          memo: `派彩 ${b.side}`,
          balanceAfter: after.balance,
          bankAfter: after.bankBalance,
        },
      });
    }
  }

  await tx.round.update({
    where: { id: roundId },
    data: { phase: asAny("SETTLED"), settledAt: new Date() },
  });
}

// 建立開牌節奏表（秒）與可見張數
function buildRevealPlan(playerCards: any[] = [], bankerCards: any[] = []) {
  // 固定：P1=0, B1=1, P2=2, B2=3
  const schedule: { who: "P"|"B"; idx: number; t: number }[] = [
    { who: "P", idx: 0, t: 0 },
    { who: "B", idx: 0, t: 1 },
    { who: "P", idx: 1, t: 2 },
    { who: "B", idx: 1, t: 3 },
  ];
  let lastT = 3;
  if (playerCards.length >= 3) { schedule.push({ who: "P", idx: 2, t: 5 }); lastT = 5; }
  if (bankerCards.length >= 3) { schedule.push({ who: "B", idx: 2, t: 7 }); lastT = 7; }
  const total = lastT + 1; // 完成後多留 1s 緩衝
  return { schedule, total };
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const roomCode = String(url.searchParams.get("room") || "R60").toUpperCase();
    const force = String(url.searchParams.get("force") || "");
    const me = await getUserFromRequest(req);

    // 房間
    const room = await prisma.room.findFirst({
      where: { code: asAny(roomCode) },
      select: { id: true, code: true, name: true, durationSeconds: true },
    });
    if (!room) return noStore({ error: "房間不存在" }, 404);

    const dayStart = taipeiDayStart(new Date());

    // 管理員強制重啟
    if (force === "restart") {
      if (!me?.isAdmin) return noStore({ error: "需要管理員權限" }, 403);
      await prisma.$transaction(async (tx) => {
        await tx.round.updateMany({
          where: { roomId: room.id, day: dayStart },
          data: { phase: asAny("SETTLED"), settledAt: new Date() },
        });
        await createNextRoundTx(tx, room.id, dayStart);
      });
    }

    // 當日最新局
    let round = await prisma.round.findFirst({
      where: { roomId: room.id, day: dayStart },
      orderBy: { roundSeq: "desc" },
      select: {
        id: true, roundSeq: true, phase: true, createdAt: true, startedAt: true,
        outcome: true, playerTotal: true, bankerTotal: true,
        playerCards: true, bankerCards: true,
      },
    });
    if (!round) {
      round = await prisma.$transaction((tx) => createNextRoundTx(tx, room.id, dayStart));
    }

    const nowMs = Date.now();
    const startMs = new Date(round.startedAt ?? round.createdAt).getTime();

    const betElapsed = Math.floor((nowMs - startMs) / 1000);
    const betLeft = Math.max(0, room.durationSeconds - betElapsed);

    let phase: "BETTING" | "REVEALING" | "SETTLED" = (round.phase as any) || "BETTING";
    let secLeft = 0;

    // 下注 → 開牌
    if (phase === "BETTING") {
      secLeft = betLeft;
      if (secLeft === 0) {
        await prisma.$transaction(async (tx) => {
          // 切到 REVEALING，並做一次發牌寫結果
          await tx.round.update({ where: { id: round!.id }, data: { phase: asAny("REVEALING") } });
          await ensureDealAtRevealTx(tx, round!.id);
        });
        phase = "REVEALING";
        // 重新取出最新（帶上卡牌）
        round = await prisma.round.findUnique({
          where: { id: round.id },
          select: {
            id: true, roundSeq: true, phase: true, createdAt: true, startedAt: true,
            outcome: true, playerTotal: true, bankerTotal: true,
            playerCards: true, bankerCards: true,
          },
        });
      }
    }

    // 開牌中：依節奏逐張顯示；倒數到 0 進入結算
    if (phase === "REVEALING") {
      // 確保有結果（首入 REVEALING 時已寫入）
      const pCards = asAny<any[]>(round?.playerCards) ?? [];
      const bCards = asAny<any[]>(round?.bankerCards) ?? [];
      const { total: revealTotal } = buildRevealPlan(pCards, bCards);

      const revealElapsed = Math.max(0, Math.floor((nowMs - startMs) / 1000) - room.durationSeconds);
      secLeft = Math.max(0, revealTotal - revealElapsed);

      if (secLeft === 0) {
        await prisma.$transaction(async (tx) => {
          await settleRoundTx(tx, round!.id);
          // 沒有更大的 roundSeq 就開下一局
          const hasNext = await tx.round.findFirst({
            where: { roomId: room.id, day: dayStart, roundSeq: { gt: round!.roundSeq } as any },
            select: { id: true },
          });
          if (!hasNext) await createNextRoundTx(tx, room.id, dayStart);
        });
        phase = "SETTLED";
        // 撈最新（下一局 or 已結算的這局）
        round = await prisma.round.findFirst({
          where: { roomId: room.id, day: dayStart },
          orderBy: { roundSeq: "desc" },
          select: {
            id: true, roundSeq: true, phase: true, createdAt: true, startedAt: true,
            outcome: true, playerTotal: true, bankerTotal: true,
            playerCards: true, bankerCards: true,
          },
        });
      }
    }

    // SETTLED：補計時（新局可能已建立）
    if (phase === "SETTLED" && round) {
      const st = new Date(round.startedAt ?? round.createdAt).getTime();
      const elapsed = Math.floor((Date.now() - st) / 1000);
      if ((round.phase as any) === "BETTING") {
        secLeft = Math.max(0, room.durationSeconds - elapsed);
      } else if ((round.phase as any) === "REVEALING") {
        const pCards = asAny<any[]>(round?.playerCards) ?? [];
        const bCards = asAny<any[]>(round?.bankerCards) ?? [];
        const { total: revealTotal } = buildRevealPlan(pCards, bCards);
        const revElapsed = Math.max(0, elapsed - room.durationSeconds);
        secLeft = Math.max(0, revealTotal - revElapsed);
      } else {
        secLeft = 0;
      }
      // 以實際 round.phase 覆蓋
      phase = (round.phase as any) || "BETTING";
    }

    // 我的投注（以 roundId 聚合）
    let myBets: Record<string, number> = {};
    if (me && round) {
      const rows = await prisma.bet.groupBy({
        by: ["side"],
        where: { userId: me.id, roundId: round.id },
        _sum: { amount: true },
      });
      for (const r of rows) {
        (myBets as any)[r.side as any] = (asAny(r)._sum.amount ?? 0) as number;
      }
    }

    // 大路（近 20 局：已結算）
    const recentRows = await prisma.round.findMany({
      where: { roomId: room.id, day: dayStart, phase: asAny("SETTLED") },
      orderBy: { roundSeq: "desc" },
      take: 20,
      select: { roundSeq: true, outcome: true, playerTotal: true, bankerTotal: true },
    });

    // 給前端動畫的卡牌顯示（加欄位，不破壞既有）
    let reveal = null as null | {
      player: { rank: string; suit: string; up: boolean }[];
      banker: { rank: string; suit: string; up: boolean }[];
    };
    if (round?.playerCards && round?.bankerCards) {
      const p = asAny<any[]>(round.playerCards) ?? [];
      const b = asAny<any[]>(round.bankerCards) ?? [];
      const { schedule, total } = buildRevealPlan(p, b);
      const elapsedAll = Math.floor((Date.now() - (new Date(round.startedAt ?? round.createdAt)).getTime()) / 1000);
      const revealElapsed = Math.max(0, elapsedAll - room.durationSeconds);
      const upCheck = (who: "P"|"B", idx: number) => {
        const s = schedule.find(x => x.who === who && x.idx === idx);
        if (!s) return false;
        return revealElapsed >= s.t;
      };
      reveal = {
        player: p.map((c, i) => ({ ...c, up: upCheck("P", i) })),
        banker: b.map((c, i) => ({ ...c, up: upCheck("B", i) })),
      };
      // 若仍在 BETTING，全部 down
      if ((round.phase as any) === "BETTING") {
        reveal = {
          player: p.map((c) => ({ ...c, up: false })),
          banker: b.map((c) => ({ ...c, up: false })),
        };
      }
    }

    return noStore({
      room: { code: room.code, name: room.name, durationSeconds: room.durationSeconds },
      day: dayStart,
      roundId: round?.id ?? null,
      roundSeq: round?.roundSeq ?? 0,
      phase,
      secLeft,
      // 保持舊欄位：REVEALING 與 SETTLED 都回 result（讓你前端顯示點數/動畫）
      result: (round && (phase === "REVEALING" || phase === "SETTLED")) ? {
        outcome: round.outcome ?? null,
        p: round.playerTotal ?? null,
        b: round.bankerTotal ?? null,
      } : null,
      myBets,
      recent: recentRows.map(r => ({
        roundSeq: r.roundSeq,
        outcome: r.outcome,
        p: r.playerTotal ?? 0,
        b: r.bankerTotal ?? 0,
      })),
      // 新增：前端翻牌使用（不破壞既有）
      reveal,
    });
  } catch (e: any) {
    return noStore({ error: e?.message || "Server error" }, 500);
  }
}
