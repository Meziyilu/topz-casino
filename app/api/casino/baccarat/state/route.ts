// app/api/casino/baccarat/state/route.ts
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyJWT } from "@/lib/jwt";
import type { Prisma } from "@prisma/client";
import { dealOneRound, payoutRatio } from "@/lib/baccarat";

type Phase = "BETTING" | "REVEALING" | "SETTLED";

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

// 台北日界（回傳該日 00:00 台北的 UTC 時刻）
function taipeiDayStart(date = new Date()) {
  const utc = date.getTime();
  const tpe = utc + 8 * 3600_000;
  const tpeStart = Math.floor(tpe / 86_400_000) * 86_400_000;
  return new Date(tpeStart - 8 * 3600_000);
}

// 建下一局（每日序號累加）
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
      phase: "BETTING",
      createdAt: now,
      startedAt: now,
    },
    select: { id: true, roundSeq: true, phase: true, startedAt: true },
  });
}

// 派彩（簡化：PLAYER/BANKER/TIE + 雙方對子）
async function settleRoundTx(tx: Prisma.TransactionClient, roundId: string) {
  // 發牌
  const result = dealOneRound([]);

  // 取本局全部下注
  const bets = await tx.bet.findMany({
    where: { roundId },
    select: { id: true, userId: true, side: true, amount: true },
  });

  // 按照賠率派彩
  for (const b of bets) {
    const ratio = payoutRatio(b.side, result);
    if (ratio <= 0) continue; // 輸或和局退注=0 的已在 ratio 回傳 0 或 -1
    const win = Math.floor(b.amount * ratio);

    const after = await tx.user.update({
      where: { id: b.userId },
      data: { balance: { increment: win } },
      select: { balance: true, bankBalance: true },
    });

    await tx.ledger.create({
      data: {
        userId: b.userId,
        type: "PAYOUT",
        target: "WALLET",
        delta: win,
        memo: `派彩 ${b.side} 中獎`,
        balanceAfter: after.balance,
        bankAfter: after.bankBalance,
      },
    });
  }

  // 更新回合結果
  await tx.round.update({
    where: { id: roundId },
    data: {
      phase: "SETTLED",
      settledAt: new Date(),
      outcome: result.outcome,
      playerTotal: result.playerTotal,
      bankerTotal: result.bankerTotal,
      playerPair: result.playerPair,
      bankerPair: result.bankerPair,
      anyPair: result.anyPair,
      perfectPair: result.perfectPair,
      playerCards: result.playerCards,
      bankerCards: result.bankerCards,
    },
  });
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const roomCode = String(url.searchParams.get("room") || "R60").toUpperCase();
    const force = String(url.searchParams.get("force") || "");

    const me = await getUser(req);

    const room = await prisma.room.findFirst({
      where: { code: roomCode },
      select: { id: true, code: true, name: true, durationSeconds: true },
    });
    if (!room) return noStoreJson({ error: "房間不存在" }, 404);

    const dayStartUtc = taipeiDayStart(new Date());
    const dayEndUtc = new Date(dayStartUtc.getTime() + 86_400_000);

    // 管理員強制重啟
    if (force === "restart") {
      if (!me?.isAdmin) return noStoreJson({ error: "需要管理員權限" }, 403);
      await prisma.$transaction(async (tx) => {
        await tx.round.updateMany({
          where: { roomId: room.id, day: dayStartUtc },
          data: { phase: "SETTLED", settledAt: new Date() },
        });
        await createNextRoundTx(tx, room.id, dayStartUtc);
      });
    }

    // 取當日最新局
    let round = await prisma.round.findFirst({
      where: { roomId: room.id, day: dayStartUtc },
      orderBy: [{ roundSeq: "desc" }],
      select: {
        id: true, roundSeq: true, phase: true,
        startedAt: true, createdAt: true,
        outcome: true, playerTotal: true, bankerTotal: true,
      },
    });

    if (!round) {
      round = await prisma.$transaction(async (tx) => createNextRoundTx(tx, room.id, dayStartUtc));
    }

    // 驅動狀態機
    const now = Date.now();
    const startMs = new Date(round.startedAt ?? round.createdAt).getTime();
    const betLeft = Math.max(0, room.durationSeconds - Math.floor((now - startMs) / 1000));
    const revealDuration = 5;

    let phase: Phase = (round.phase as any) || "BETTING";
    let secLeft = 0;

    if (phase === "BETTING") {
      secLeft = betLeft;
      if (secLeft === 0) {
        await prisma.$transaction(async (tx) => {
          await tx.round.update({ where: { id: round!.id }, data: { phase: "REVEALING" } });
        });
        phase = "REVEALING";
        secLeft = revealDuration;
      }
    }

    if (phase === "REVEALING") {
      // 換算已經 reveal 幾秒
      const revealElapsed = Math.max(0, Math.floor((now - startMs) / 1000) - room.durationSeconds);
      secLeft = Math.max(0, revealDuration - revealElapsed);
      if (secLeft === 0) {
        await prisma.$transaction(async (tx) => settleRoundTx(tx, round!.id));
        phase = "SETTLED";
      }
    }

    if (phase === "SETTLED") {
      // 開下一局（若沒有更大序）
      const hasNext = await prisma.round.findFirst({
        where: { roomId: room.id, day: dayStartUtc, roundSeq: { gt: round.roundSeq } },
        select: { id: true },
      });
      if (!hasNext) {
        await prisma.$transaction(async (tx) => createNextRoundTx(tx, room.id, dayStartUtc));
      }
      // 重新撈最新
      round = await prisma.round.findFirst({
        where: { roomId: room.id, day: dayStartUtc },
        orderBy: [{ roundSeq: "desc" }],
        select: {
          id: true, roundSeq: true, phase: true,
          startedAt: true, createdAt: true,
          outcome: true, playerTotal: true, bankerTotal: true,
        },
      });
      phase = (round!.phase as any) || "BETTING";

      // 重新算倒數
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

    // 我的投注（以 roundId 聚合，**不再用 day/roundSeq**）
    let myBets: Record<string, number> = {};
    if (me && round) {
      const rows = await prisma.bet.groupBy({
        by: ["side"],
        where: { userId: me.id, roundId: round.id },
        _sum: { amount: true },
      });
      for (const r of rows) (myBets as any)[r.side as any] = (r as any)._sum.amount ?? 0;
    }

    // 當日最近 20 局戰績
    const recentRows = await prisma.round.findMany({
      where: { roomId: room.id, day: dayStartUtc, phase: "SETTLED" },
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
      result: phase === "SETTLED"
        ? { outcome: round!.outcome ?? null, p: round!.playerTotal ?? null, b: round!.bankerTotal ?? null }
        : null,
      myBets,
      recent: recentRows.map(r => ({ roundSeq: r.roundSeq, outcome: r.outcome, p: r.playerTotal ?? 0, b: r.bankerTotal ?? 0 })),
    });
  } catch (e: any) {
    return noStoreJson({ error: e?.message || "Server error" }, 500);
  }
}
