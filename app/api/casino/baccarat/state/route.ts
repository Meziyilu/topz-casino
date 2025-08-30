// app/api/casino/baccarat/state/route.ts
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyJWT } from "@/lib/jwt";
import type { Prisma } from "@prisma/client";
import { dealRound } from "@/lib/baccarat"; // 需提供一局完整結果（含牌面/點數/對子）

// ----------------- 小工具 -----------------
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

// 台北日 00:00（用 UTC 儲存）
function taipeiDayStart(date = new Date()) {
  const utc = date.getTime();
  const tpe = utc + 8 * 3600_000;
  const tpeStart = Math.floor(tpe / 86_400_000) * 86_400_000;
  return new Date(tpeStart - 8 * 3600_000);
}

// ----------------- 資料庫交易工具 -----------------
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

// 在切到 REVEALING 的瞬間，若尚未有結果，發一次牌並寫入
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

  const result = dealRound(); // 需回傳 { outcome, playerTotal, bankerTotal, playerPair, bankerPair, anyPair, perfectPair, playerCards, bankerCards }
  await tx.round.update({
    where: { id: roundId },
    data: {
      outcome: asAny(result.outcome),
      playerTotal: result.playerTotal,
      bankerTotal: result.bankerTotal,
      playerPair: result.playerPair ?? false,
      bankerPair: result.bankerPair ?? false,
      anyPair: result.anyPair ?? false,
      perfectPair: result.perfectPair ?? false,
      playerCards: asAny(result.playerCards ?? []),
      bankerCards: asAny(result.bankerCards ?? []),
    },
  });
}

// 結算（不重發牌）
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

  // 賠率（基本）
  const baseRate: Record<string, number> = {
    PLAYER: 1.0,
    BANKER: 0.95,
    TIE: 8.0,
    PLAYER_PAIR: 11.0,
    BANKER_PAIR: 11.0,
  };

  for (const b of bets) {
    // 和局退非和注
    if (r.outcome === asAny("TIE") && b.side !== asAny("TIE")) {
      // 退回本金
      const after = await tx.user.update({
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
          memo: `和局退注`,
          balanceAfter: after.balance,
          bankAfter: after.bankBalance,
        },
      });
      continue;
    }

    // 一般賠彩
    let win = 0;
    if (b.side === asAny("PLAYER") && r.outcome === asAny("PLAYER")) {
      win = Math.floor(b.amount * baseRate.PLAYER);
    } else if (b.side === asAny("BANKER") && r.outcome === asAny("BANKER")) {
      win = Math.floor(b.amount * baseRate.BANKER);
    } else if (b.side === asAny("TIE") && r.outcome === asAny("TIE")) {
      win = Math.floor(b.amount * baseRate.TIE);
    } else if (b.side === asAny("PLAYER_PAIR") && r.playerPair) {
      win = Math.floor(b.amount * baseRate.PLAYER_PAIR);
    } else if (b.side === asAny("BANKER_PAIR") && r.bankerPair) {
      win = Math.floor(b.amount * baseRate.BANKER_PAIR);
    }

    if (win > 0) {
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
          memo: `派彩 ${String(b.side)} +${win}`,
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

// ----------------- Handler -----------------
export async function GET(req: Request) {
  try {
    const me = await getUser(req);

    const url = new URL(req.url);
    const roomCode = String(url.searchParams.get("room") || "R60").toUpperCase();
    const force = String(url.searchParams.get("force") || "");

    // 找房間
    const room = await prisma.room.findFirst({
      where: { code: asAny(roomCode) },
      select: { id: true, code: true, name: true, durationSeconds: true },
    });
    if (!room) return noStoreJson({ error: "房間不存在" }, 404);

    const dayStartUtc = taipeiDayStart(new Date());

    // 管理員強制重啟（結掉當日局 -> 新開）
    if (force === "restart") {
      if (!me?.isAdmin) return noStoreJson({ error: "需要管理員權限" }, 403);
      await prisma.$transaction(async (tx) => {
        await tx.round.updateMany({
          where: { roomId: room.id, day: dayStartUtc, phase: asAny({ not: "SETTLED" }) },
          data: { phase: asAny("SETTLED"), settledAt: new Date() },
        });
        await createNextRoundTx(tx, room.id, dayStartUtc);
      });
    }

    // 取當日最新一局（若沒有就建一局）
    let round = await prisma.round.findFirst({
      where: { roomId: room.id, day: dayStartUtc },
      orderBy: { roundSeq: "desc" },
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
      round = await prisma.$transaction(async (tx) => createNextRoundTx(tx, room.id, dayStartUtc));
    }

    // 狀態推進與倒數
    const now = Date.now();
    const startMs = new Date(round.startedAt ?? round.createdAt).getTime();
    const betLeft = Math.max(0, room.durationSeconds - Math.floor((now - startMs) / 1000));
    const revealDuration = 6; // 開牌展示秒數

    let phase: "BETTING" | "REVEALING" | "SETTLED" = (round.phase as any) || "BETTING";
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

        // 重新撈含牌面
        round = await prisma.round.findUnique({
          where: { id: round!.id },
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
        }) as NonNullable<typeof round>;
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

      // 撈最新一局
      round = await prisma.round.findFirst({
        where: { roomId: room.id, day: dayStartUtc },
        orderBy: { roundSeq: "desc" },
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
      }) as NonNullable<typeof round>;

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

    // 我的投注（對齊 bet API：以 roundId 聚合）
    let myBets: Record<string, number> = {};
    if (me && round) {
      const rows = await prisma.bet.groupBy({
        by: ["side"],
        where: { userId: me.id, roundId: round.id },
        _sum: { amount: true },
      });
      for (const r of rows) {
        (myBets as any)[r.side as any] = (r as any)._sum.amount ?? 0;
      }
    }

    // 今日近 20 局（已結算）
    const recentRows = await prisma.round.findMany({
      where: { roomId: room.id, day: dayStartUtc, phase: asAny("SETTLED") },
      orderBy: { roundSeq: "desc" },
      take: 20,
      select: { roundSeq: true, outcome: true, playerTotal: true, bankerTotal: true },
    });

    return noStoreJson({
      room: { code: room.code, name: room.name, durationSeconds: room.durationSeconds },
      day: dayStartUtc,
      roundId: round.id,
      roundSeq: round.roundSeq,
      phase,
      secLeft,
      result:
        phase !== "BETTING"
          ? {
              outcome: (round.outcome ?? null) as any,
              p: round.playerTotal ?? null,
              b: round.bankerTotal ?? null,
            }
          : null,
      cards:
        phase !== "BETTING"
          ? {
              player: (round.playerCards as any) ?? [],
              banker: (round.bankerCards as any) ?? [],
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
