// app/api/casino/baccarat/state/route.ts
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyJWT } from "@/lib/jwt";
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

// 台北當日 00:00（轉成 UTC）
function taipeiDayStart(date = new Date()) {
  const utc = date.getTime();
  const tpe = utc + 8 * 3600_000;
  const tpeStart = Math.floor(tpe / 86_400_000) * 86_400_000;
  return new Date(tpeStart - 8 * 3600_000);
}

// 交易內：建立下一局（下注中）
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
      id: true, createdAt: true, startedAt: true,
      roundSeq: true, phase: true,
      outcome: true, playerTotal: true, bankerTotal: true,
      playerPair: true, bankerPair: true, anyPair: true, perfectPair: true,
      playerCards: true, bankerCards: true,
    },
  });
}

// 交易內：進入 REVEALING 同步「先發牌且寫結果（不派彩）」
async function revealNowTx(tx: Prisma.TransactionClient, roundId: string) {
  const r = await tx.round.findUnique({
    where: { id: roundId },
    select: { phase: true, outcome: true },
  });
  if (!r) return;

  // 只在還沒有結果時發一次牌
  if (!r.outcome) {
    const result = dealOneRound([]);
    await tx.round.update({
      where: { id: roundId },
      data: {
        phase: asAny("REVEALING"),
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
  } else if (r.phase !== "REVEALING") {
    await tx.round.update({
      where: { id: roundId },
      data: { phase: asAny("REVEALING") },
    });
  }
}

// 交易內：派彩並結束本局
async function settleRoundTx(tx: Prisma.TransactionClient, roundId: string) {
  const r = await tx.round.findUnique({
    where: { id: roundId },
    select: {
      id: true, outcome: true, playerTotal: true, bankerTotal: true,
    },
  });
  if (!r?.outcome) {
    // 理論上不會發生（revealNowTx 已經先決定 outcome），安全起見補發
    const result = dealOneRound([]);
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

  const bets = await tx.bet.findMany({
    where: { roundId },
    select: { id: true, userId: true, side: true, amount: true },
  });

  for (const b of bets) {
    const ratio = payoutRatio(asAny(b.side), {
      outcome: (r?.outcome ?? asAny(null)) as any,
      playerTotal: r?.playerTotal ?? 0,
      bankerTotal: r?.bankerTotal ?? 0,
      playerPair: false, bankerPair: false, anyPair: false, perfectPair: false,
      playerCards: [], bankerCards: [],
    });
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
    data: { phase: asAny("SETTLED"), settledAt: new Date() },
  });
}

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
    const revealDuration = 3; // 👈 掀牌動畫時間（秒）

    // 管理員強制重啟
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

    // 抓目前局
    let round = await prisma.round.findFirst({
      where: { roomId: room.id, day: dayStartUtc },
      orderBy: [{ roundSeq: "desc" }],
      select: {
        id: true, createdAt: true, startedAt: true,
        roundSeq: true, phase: true,
        outcome: true, playerTotal: true, bankerTotal: true,
        playerCards: true, bankerCards: true,
      },
    });

    if (!round) {
      round = await prisma.$transaction(async (tx) =>
        createNextRoundTx(tx, room.id, dayStartUtc)
      );
    }

    // 相位推進
    const now = Date.now();
    const startMs = new Date(round.startedAt ?? round.createdAt).getTime();
    const elapsed = Math.floor((now - startMs) / 1000);

    // 下注期 -> 到時改 REVEALING，且在 REVEALING 立刻寫入結果（不派彩）
    if (round.phase === "BETTING" && elapsed >= room.durationSeconds) {
      await prisma.$transaction(async (tx) => {
        await revealNowTx(tx, round!.id);
      });
      round = await prisma.round.findUnique({
        where: { id: round.id },
        select: {
          id: true, createdAt: true, startedAt: true,
          roundSeq: true, phase: true,
          outcome: true, playerTotal: true, bankerTotal: true,
          playerCards: true, bankerCards: true,
        },
      });
    }

    // REVEALING -> 到時派彩 + SETTLED
    if (round!.phase === "REVEALING" && elapsed >= room.durationSeconds + revealDuration) {
      await prisma.$transaction(async (tx) => {
        await settleRoundTx(tx, round!.id);
      });
      round = await prisma.round.findUnique({
        where: { id: round.id },
        select: {
          id: true, createdAt: true, startedAt: true,
          roundSeq: true, phase: true,
          outcome: true, playerTotal: true, bankerTotal: true,
          playerCards: true, bankerCards: true,
        },
      });
    }

    // SETTLED -> 準備下一局（如果沒有）
    if (round!.phase === "SETTLED") {
      const hasNext = await prisma.round.findFirst({
        where: { roomId: room.id, day: dayStartUtc, roundSeq: asAny({ gt: round!.roundSeq }) },
        select: { id: true },
      });
      if (!hasNext) {
        await prisma.$transaction(async (tx) =>
          createNextRoundTx(tx, room.id, dayStartUtc)
        );
      }
    }

    // 重新計算剩餘秒數
    const now2 = Date.now();
    const st = new Date(round!.startedAt ?? round!.createdAt).getTime();
    let secLeft = 0;
    if (round!.phase === "BETTING") {
      secLeft = Math.max(0, room.durationSeconds - Math.floor((now2 - st) / 1000));
    } else if (round!.phase === "REVEALING") {
      const revElapsed = Math.max(0, Math.floor((now2 - st) / 1000) - room.durationSeconds);
      secLeft = Math.max(0, revealDuration - revElapsed);
    } else {
      secLeft = 0;
    }

    // 我的投注：以 roundId 聚合
    let myBets: Record<string, number> = {};
    if (me) {
      const rows = await prisma.bet.groupBy({
        by: ["side"],
        where: { userId: me.id, roundId: round!.id },
        _sum: { amount: true },
      });
      for (const r of rows) (myBets as any)[r.side as any] = (r as any)._sum.amount ?? 0;
    }

    // 今日近 20 局結果
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
      phase: round!.phase,
      secLeft,
      // 👇 REVEALING 就會有 result（用來觸發翻牌動畫）
      result: round!.outcome
        ? {
            outcome: round!.outcome,
            p: round!.playerTotal ?? null,
            b: round!.bankerTotal ?? null,
          }
        : null,
      cards: {
        player: round!.playerCards ?? [],
        banker: round!.bankerCards ?? [],
      },
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
