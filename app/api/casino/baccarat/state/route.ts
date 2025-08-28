export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import type { Prisma } from "@prisma/client";
import { dealOneRound, payoutRatio } from "@/lib/baccarat";

const asAny = <T = any>(v: unknown) => v as T;

function noStoreJson(payload: any, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

function taipeiDayStart(date = new Date()) {
  const utc = date.getTime();
  const tpe = utc + 8 * 3600_000;
  const tpeStart = Math.floor(tpe / 86_400_000) * 86_400_000;
  return new Date(tpeStart - 8 * 3600_000);
}

async function createNextRoundTx(tx: Prisma.TransactionClient, roomId: string, dayStartUtc: Date) {
  const latest = await tx.round.findFirst({
    where: { roomId, day: dayStartUtc },
    orderBy: [{ roundSeq: "desc" }],
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
      id: true,
      createdAt: true,
      roundSeq: true,
      phase: true,
      startedAt: true,
      outcome: true,
      playerTotal: true,
      bankerTotal: true,
    },
  });
}

async function settleRoundTx(tx: Prisma.TransactionClient, roundId: string) {
  const result = dealOneRound([]);

  const bets = await tx.bet.findMany({
    where: { roundId },
    select: { id: true, userId: true, side: true, amount: true },
  });

  for (const b of bets) {
    const ratio = payoutRatio(asAny(b.side), result);
    if (ratio <= 0) continue;
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
        memo: `派彩 ${b.side} 中獎`,
        balanceAfter: after.balance,
        bankAfter: after.bankBalance,
      },
    });
  }

  await tx.round.update({
    where: { id: roundId },
    data: {
      phase: asAny("SETTLED"),
      settledAt: new Date(),
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

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const roomCode = String(url.searchParams.get("room") || "R60").toUpperCase();
    const force = String(url.searchParams.get("force") || "");
    const me = await getUserFromRequest(req);

    const room = await prisma.room.findFirst({
      where: { code: asAny(roomCode) },
      select: { id: true, code: true, name: true, durationSeconds: true },
    });
    if (!room) return noStoreJson({ error: "房間不存在" }, 404);

    const dayStartUtc = taipeiDayStart(new Date());

    if (force === "restart") {
      if (!me?.isAdmin) return noStoreJson({ error: "需要管理員權限" }, 403);
      await prisma.$transaction(async (tx) => {
        await tx.round.updateMany({
          where: { roomId: room.id, day: dayStartUtc },
          data: { phase: asAny("SETTLED"), settledAt: new Date() },
        });
        await createNextRoundTx(tx, room.id, dayStartUtc);
      });
    }

    let round = await prisma.round.findFirst({
      where: { roomId: room.id, day: dayStartUtc },
      orderBy: [{ roundSeq: "desc" }],
      select: {
        id: true,
        createdAt: true,
        roundSeq: true,
        phase: true,
        startedAt: true,
        outcome: true,
        playerTotal: true,
        bankerTotal: true,
      },
    });

    if (!round) {
      round = await prisma.$transaction(async (tx) => createNextRoundTx(tx, room.id, dayStartUtc));
    }

    const now = Date.now();
    const startMs = new Date(round!.startedAt ?? round!.createdAt).getTime();
    const betLeft = Math.max(0, room.durationSeconds - Math.floor((now - startMs) / 1000));
    const revealDuration = 5;

    let phase: "BETTING" | "REVEALING" | "SETTLED" = (round!.phase as any) || "BETTING";
    let secLeft = 0;

    if (phase === "BETTING") {
      secLeft = betLeft;
      if (secLeft === 0) {
        await prisma.round.update({ where: { id: round!.id }, data: { phase: asAny("REVEALING") } });
        phase = "REVEALING";
        secLeft = revealDuration;
      }
    }

    if (phase === "REVEALING") {
      const revealElapsed = Math.max(0, Math.floor((now - startMs) / 1000) - room.durationSeconds);
      secLeft = Math.max(0, revealDuration - revealElapsed);
      if (secLeft === 0) {
        await prisma.$transaction(async (tx) => settleRoundTx(tx, round!.id));
        phase = "SETTLED";
      }
    }

    if (phase === "SETTLED") {
      const hasNext = await prisma.round.findFirst({
        where: { roomId: room.id, day: dayStartUtc, roundSeq: asAny({ gt: round!.roundSeq }) },
        select: { id: true },
      });
      if (!hasNext) {
        await prisma.$transaction(async (tx) => createNextRoundTx(tx, room.id, dayStartUtc));
      }
      round = await prisma.round.findFirst({
        where: { roomId: room.id, day: dayStartUtc },
        orderBy: [{ roundSeq: "desc" }],
        select: {
          id: true,
          createdAt: true,
          roundSeq: true,
          phase: true,
          startedAt: true,
          outcome: true,
          playerTotal: true,
          bankerTotal: true,
        },
      })!;
      phase = (round.phase as any) || "BETTING";
      const st = new Date(round.startedAt ?? round.createdAt).getTime();
      if (phase === "BETTING") {
        secLeft = Math.max(0, room.durationSeconds - Math.floor((Date.now() - st) / 1000));
      } else if (phase === "REVEALING") {
        const revElapsed = Math.max(0, Math.floor((Date.now() - st) / 1000) - room.durationSeconds);
        secLeft = Math.max(0, revealDuration - revElapsed);
      } else {
        secLeft = 0;
      }
    }

    let myBets: Record<string, number> = {};
    if (me && round) {
      const rows = await prisma.bet.groupBy({
        by: ["side"],
        where: { userId: me.id, roundId: round.id },
        _sum: { amount: true },
      });
      for (const r of rows as any[]) {
        myBets[r.side] = r._sum?.amount ?? 0;
      }
    }

    const recentRows = await prisma.round.findMany({
      where: { roomId: room.id, day: dayStartUtc, phase: asAny("SETTLED") },
      orderBy: [{ roundSeq: "desc" }],
      take: 20,
      select: { roundSeq: true, outcome: true, playerTotal: true, bankerTotal: true },
    });

    return noStoreJson({
      room: { code: room.code, name: room.name, durationSeconds: room.durationSeconds },
      day: dayStartUtc,
      roundId: round!.id,
      roundSeq: round!.roundSeq,
      phase,
      secLeft,
      result:
        phase === "SETTLED"
          ? { outcome: round!.outcome ?? null, p: round!.playerTotal ?? null, b: round!.bankerTotal ?? null }
          : null,
      myBets,
      recent: recentRows.map((r) => ({ roundSeq: r.roundSeq, outcome: r.outcome, p: r.playerTotal ?? 0, b: r.bankerTotal ?? 0 })),
    });
  } catch (e: any) {
    return noStoreJson({ error: e?.message || "Server error" }, 500);
  }
}
