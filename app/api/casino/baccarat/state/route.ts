// app/api/casino/baccarat/state/route.ts
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyJWT } from "@/lib/jwt";
import type { Prisma } from "@prisma/client";
import { dealRound, payoutRatio } from "@/lib/baccarat";

// ---------- helpers ----------
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

function readTokenFromHeaders(req: Request): string | null {
  const raw = req.headers.get("cookie");
  if (!raw) return null;
  const m = raw.match(/(?:^|;\s*)token=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

async function getUser(req: Request) {
  const token = readTokenFromHeaders(req);
  if (!token) return null;
  const payload = await verifyJWT(token).catch(() => null);
  if (!payload?.sub) return null;
  return prisma.user.findUnique({
    where: { id: String(payload.sub) },
    select: { id: true, email: true, isAdmin: true },
  });
}

// 當日台北 00:00（轉 UTC 儲存）
function taipeiDayStart(date = new Date()) {
  const utc = date.getTime();
  const tpe = utc + 8 * 3600_000;
  const tpeStart = Math.floor(tpe / 86_400_000) * 86_400_000;
  return new Date(tpeStart - 8 * 3600_000);
}

// ---------- tx utils ----------
async function createNextRoundTx(
  tx: Prisma.TransactionClient,
  roomId: string,
  dayStartUtc: Date
) {
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

// 進入 REVEALING 時，若未有牌面結果，就產生一次，並寫入 DB
async function ensureCardsOnReveal(tx: Prisma.TransactionClient, roundId: string) {
  const r = await tx.round.findUnique({
    where: { id: roundId },
    select: {
      id: true, outcome: true,
      playerTotal: true, bankerTotal: true,
      playerPair: true, bankerPair: true, anyPair: true, perfectPair: true,
      playerCards: true, bankerCards: true,
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

// 結算（TIE 時非 TIE 注單視為退注：不加不減）
async function settleRoundTx(tx: Prisma.TransactionClient, roundId: string) {
  const r = await tx.round.findUnique({
    where: { id: roundId },
    select: {
      id: true, outcome: true,
      playerTotal: true, bankerTotal: true,
      playerPair: true, bankerPair: true,
    },
  });
  if (!r?.outcome) return;

  const bets = await tx.bet.findMany({
    where: { roundId },
    select: { id: true, userId: true, side: true, amount: true },
  });

  for (const b of bets) {
    if (r.outcome === "TIE" && b.side !== asAny("TIE")) {
      // 退注：略過（不記帳、不增減）
      continue;
    }
    const ratio = payoutRatio[asAny(b.side)] ?? 0;
    const win = Math.floor(b.amount * ratio);
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
        memo: `派彩 ${b.side} 中獎`,
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

// ---------- handler ----------
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const roomCode = String(url.searchParams.get("room") || "R60").toUpperCase();
    const force = String(url.searchParams.get("force") || "");

    const me = await getUser(req);

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
        id: true, createdAt: true, startedAt: true, roundSeq: true, phase: true,
        outcome: true, playerTotal: true, bankerTotal: true, playerCards: true, bankerCards: true,
      },
    });

    if (!round) {
      round = await prisma.$transaction(async (tx) =>
        createNextRoundTx(tx, room.id, dayStartUtc)
      );
    }

    // 推進狀態 & 倒數
    const now = Date.now();
    const startMs = new Date(round.startedAt ?? round.createdAt).getTime();
    const betLeft = Math.max(0, room.durationSeconds - Math.floor((now - startMs) / 1000));
    const revealDuration = 6;

    let phase: "BETTING" | "REVEALING" | "SETTLED" = (round.phase as any) || "BETTING";
    let secLeft = 0;

    if (phase === "BETTING") {
      secLeft = betLeft;
      if (secLeft === 0) {
        await prisma.$transaction(async (tx) => {
          await tx.round.update({ where: { id: round!.id }, data: { phase: asAny("REVEALING") } });
          await ensureCardsOnReveal(tx, round!.id);
        });
        phase = "REVEALING";
        secLeft = revealDuration;

        round = await prisma.round.findUnique({
          where: { id: round.id },
          select: {
            id: true, createdAt: true, startedAt: true, roundSeq: true, phase: true,
            outcome: true, playerTotal: true, bankerTotal: true, playerCards: true, bankerCards: true,
          },
        });
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
        where: { roomId: room.id, day: dayStartUtc, roundSeq: asAny({ gt: round.roundSeq }) },
        select: { id: true },
      });
      if (!hasNext) {
        await prisma.$transaction(async (tx) => createNextRoundTx(tx, room.id, dayStartUtc));
      }
      round = await prisma.round.findFirst({
        where: { roomId: room.id, day: dayStartUtc },
        orderBy: [{ roundSeq: "desc" }],
        select: {
          id: true, createdAt: true, startedAt: true, roundSeq: true, phase: true,
          outcome: true, playerTotal: true, bankerTotal: true, playerCards: true, bankerCards: true,
        },
      });

      phase = (round!.phase as any) || "BETTING";
      const st = new Date(round!.startedAt ?? round!.createdAt).getTime();
      if (phase === "BETTING") {
        secLeft = Math.max(0, room.durationSeconds - Math.floor((Date.now() - st) / 1000));
      } else if (phase === "REVEALING") {
        const revElapsed = Math.max(0, Math.floor((Date.now() - st) / 1000) - room.durationSeconds);
        secLeft = Math.max(0, revealDuration - revElapsed);
      } else {
        secLeft = 0;
      }
    }

    // 我的投注
    let myBets: Record<string, number> = {};
    if (me && round) {
      const rows = await prisma.bet.groupBy({
        by: ["side"],
        where: { userId: me.id, roundId: round.id },
        _sum: { amount: true },
      });
      for (const r of rows) (myBets as any)[r.side as any] = (r as any)._sum.amount ?? 0;
    }

    // 近 20 局
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
        outcome: r.outcome,
        p: r.playerTotal ?? 0,
        b: r.bankerTotal ?? 0,
      })),
    });
  } catch (e: any) {
    return noStoreJson({ error: e?.message || "Server error" }, 500);
  }
}
