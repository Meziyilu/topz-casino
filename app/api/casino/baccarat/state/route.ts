// app/api/casino/baccarat/state/route.ts
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import type { Prisma } from "@prisma/client";
import { dealRound, payoutRatio } from "@/lib/baccarat";

const asAny = <T = any>(v: unknown) => v as T;

function noStoreJson(payload: any, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control":
        "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

// 台北當天 00:00（用 UTC 儲存）
function taipeiDayStart(date = new Date()) {
  const ms = date.getTime() + 8 * 3600_000;
  const startMs = Math.floor(ms / 86_400_000) * 86_400_000;
  return new Date(startMs - 8 * 3600_000);
}

// 建下一局（同日 same room，roundSeq 自增）
async function createNextRoundTx(
  tx: Prisma.TransactionClient,
  roomId: string,
  day: Date
) {
  const latest = await tx.round.findFirst({
    where: { roomId, day },
    orderBy: [{ roundSeq: "desc" }],
    select: { roundSeq: true },
  });
  const nextSeq = (latest?.roundSeq ?? 0) + 1;
  const now = new Date();
  return tx.round.create({
    data: {
      roomId,
      day,
      roundSeq: nextSeq,
      phase: asAny("BETTING"),
      createdAt: now,
      startedAt: now,
    },
    select: {
      id: true,
      createdAt: true,
      startedAt: true,
      roundSeq: true,
      phase: true,
      outcome: true,
      playerTotal: true,
      bankerTotal: true,
      playerCards: true,
      bankerCards: true,
    },
  });
}

// REVEALING 時若尚未有結果 → 發牌寫進 DB
async function ensureCardsOnReveal(
  tx: Prisma.TransactionClient,
  roundId: string
) {
  const r = await tx.round.findUnique({
    where: { id: roundId },
    select: {
      id: true,
      outcome: true,
      playerTotal: true,
      bankerTotal: true,
      playerCards: true,
      bankerCards: true,
    },
  });
  if (r?.outcome) return;

  const result = dealRound();
  await tx.round.update({
    where: { id: roundId },
    data: {
      outcome: asAny(result.outcome),
      playerTotal: result.playerTotal,
      bankerTotal: result.bankerTotal,
      playerPair: result.playerPair,
      bankerPair: result.bankerPair,
      anyPair: result.anyPair,
      perfectPair: result.perfectPair,
      playerCards: asAny(result.playerCards),
      bankerCards: asAny(result.bankerCards),
    },
  });
}

// 結算：派彩 + 和局退注 + 標記 SETTLED
async function settleRoundTx(tx: Prisma.TransactionClient, roundId: string) {
  const r = await tx.round.findUnique({
    where: { id: roundId },
    select: {
      id: true,
      outcome: true,
      playerTotal: true,
      bankerTotal: true,
      playerPair: true,
      bankerPair: true,
    },
  });
  if (!r?.outcome) return;

  const bets = await tx.bet.findMany({
    where: { roundId },
    select: { id: true, userId: true, side: true, amount: true },
  });

  for (const b of bets) {
    // 和局退注（押 PLAYER/BANKER 時）
    if (r.outcome === asAny("TIE") && b.side !== asAny("TIE")) {
      const refund = b.amount;
      const after = await tx.user.update({
        where: { id: b.userId },
        data: { balance: { increment: refund } },
        select: { balance: true, bankBalance: true },
      });
      await tx.ledger.create({
        data: {
          userId: b.userId,
          type: asAny("PAYOUT"),
          target: asAny("WALLET"),
          delta: refund,
          memo: "和局退注",
          balanceAfter: after.balance,
          bankAfter: after.bankBalance,
        },
      });
      continue;
    }

    const mul = payoutRatio(asAny(b.side), {
      outcome: asAny(r.outcome),
      playerPair: r.playerPair ?? false,
      bankerPair: r.bankerPair ?? false,
    });

    const win = Math.floor(b.amount * mul);
    if (win <= 0) continue;

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

  await tx.round.update({
    where: { id: roundId },
    data: { phase: asAny("SETTLED"), settledAt: new Date() },
  });
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
    if (!room) return noStoreJson({ error: "房間不存在" }, 404);

    const day = taipeiDayStart(new Date());

    // 管理員強制重啟：結束當日所有局，建立新局
    if (force === "restart") {
      if (!me?.isAdmin) return noStoreJson({ error: "需要管理員權限" }, 403);
      await prisma.$transaction(async (tx) => {
        await tx.round.updateMany({
          where: { roomId: room.id, day },
          data: { phase: asAny("SETTLED"), settledAt: new Date() },
        });
        await createNextRoundTx(tx, room.id, day);
      });
    }

    // 當日最新一局
    let round = await prisma.round.findFirst({
      where: { roomId: room.id, day },
      orderBy: [{ roundSeq: "desc" }],
      select: {
        id: true,
        createdAt: true,
        startedAt: true,
        roundSeq: true,
        phase: true,
        outcome: true,
        playerTotal: true,
        bankerTotal: true,
        playerCards: true,
        bankerCards: true,
      },
    });

    if (!round) {
      round = await prisma.$transaction(async (tx) =>
        createNextRoundTx(tx, room.id, day)
      );
    }

    // 狀態推進
    const now = Date.now();
    const startMs = new Date(round.startedAt ?? round.createdAt).getTime();
    const betLeft = Math.max(
      0,
      room.durationSeconds - Math.floor((now - startMs) / 1000)
    );
    const revealDuration = 6;

    let phase: "BETTING" | "REVEALING" | "SETTLED" =
      (round.phase as any) || "BETTING";
    let secLeft = 0;

    if (phase === "BETTING") {
      secLeft = betLeft;
      if (secLeft === 0) {
        await prisma.$transaction(async (tx) => {
          await tx.round.update({
            where: { id: round!.id },
            data: { phase: asAny("REVEALING") },
          });
          await ensureCardsOnReveal(tx, round!.id);
        });

        phase = "REVEALING";
        secLeft = revealDuration;

        // 重新撈，確保 cards 帶回
        round = await prisma.round.findUnique({
          where: { id: round.id },
          select: {
            id: true,
            createdAt: true,
            startedAt: true,
            roundSeq: true,
            phase: true,
            outcome: true,
            playerTotal: true,
            bankerTotal: true,
            playerCards: true,
            bankerCards: true,
          },
        });
      }
    }

    if (phase === "REVEALING") {
      const revealElapsed = Math.max(
        0,
        Math.floor((now - startMs) / 1000) - room.durationSeconds
      );
      secLeft = Math.max(0, revealDuration - revealElapsed);
      if (secLeft === 0) {
        await prisma.$transaction(async (tx) => {
          await settleRoundTx(tx, round!.id);
        });
        phase = "SETTLED";
      }
    }

    if (phase === "SETTLED") {
      const hasNext = await prisma.round.findFirst({
        where: { roomId: room.id, day, roundSeq: asAny({ gt: round.roundSeq }) },
        select: { id: true },
      });
      if (!hasNext) {
        await prisma.$transaction(async (tx) => {
          await createNextRoundTx(tx, room.id, day);
        });
      }

      // 重新抓最新局
      round = await prisma.round.findFirst({
        where: { roomId: room.id, day },
        orderBy: [{ roundSeq: "desc" }],
        select: {
          id: true,
          createdAt: true,
          startedAt: true,
          roundSeq: true,
          phase: true,
          outcome: true,
          playerTotal: true,
          bankerTotal: true,
          playerCards: true,
          bankerCards: true,
        },
      });

      phase = (round!.phase as any) || "BETTING";
      const st = new Date(round!.startedAt ?? round!.createdAt).getTime();
      if (phase === "BETTING") {
        secLeft = Math.max(
          0,
          room.durationSeconds - Math.floor((Date.now() - st) / 1000)
        );
      } else if (phase === "REVEALING") {
        const revElapsed = Math.max(
          0,
          Math.floor((Date.now() - st) / 1000) - room.durationSeconds
        );
        secLeft = Math.max(0, revealDuration - revElapsed);
      } else {
        secLeft = 0;
      }
    }

    // 我的投注（本局）
    let myBets: Record<string, number> = {};
    if (me) {
      const rows = await prisma.bet.groupBy({
        by: ["side"],
        where: { userId: me.id, roundId: round!.id },
        _sum: { amount: true },
      });
      for (const r of rows) {
        (myBets as any)[r.side as any] = (r as any)._sum.amount ?? 0;
      }
    }

    // 近 20 局
    const recentRows = await prisma.round.findMany({
      where: { roomId: room.id, day, phase: asAny("SETTLED") },
      orderBy: [{ roundSeq: "desc" }],
      take: 20,
      select: { roundSeq: true, outcome: true, playerTotal: true, bankerTotal: true },
    });

    return noStoreJson({
      room: {
        code: room.code,
        name: room.name,
        durationSeconds: room.durationSeconds,
      },
      day,
      roundId: round!.id,
      roundSeq: round!.roundSeq,
      phase,
      secLeft,
      result:
        phase !== "BETTING"
          ? {
              outcome: (round!.outcome ?? null) as any,
              p: round!.playerTotal ?? null,
              b: round!.bankerTotal ?? null,
            }
          : null,
      cards:
        phase !== "BETTING"
          ? {
              player: (round!.playerCards as any) ?? [],
              banker: (round!.bankerCards as any) ?? [],
            }
          : undefined,
      myBets,
      recent: recentRows.map((r) => ({
        roundSeq: r.roundSeq,
        outcome: r.outcome as any,
        p: r.playerTotal ?? 0,
        b: r.bankerTotal ?? 0,
      })),
    });
  } catch (e: any) {
    return noStoreJson({ error: e?.message || "Server error" }, 500);
  }
}
