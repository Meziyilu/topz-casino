// app/api/casino/baccarat/state/route.ts
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyJWT } from "@/lib/jwt";
import type { Prisma } from "@prisma/client";
import { dealBaccarat, payoutRatio } from "@/lib/baccarat";

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
function taipeiDayStart(date = new Date()) {
  const utc = date.getTime();
  const tpe = utc + 8 * 3600_000;
  const tpeStart = Math.floor(tpe / 86_400_000) * 86_400_000;
  return new Date(tpeStart - 8 * 3600_000);
}

// === 交易工具 ===
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
      id: true, createdAt: true, startedAt: true, roundSeq: true, phase: true,
      outcome: true, playerTotal: true, bankerTotal: true,
      playerCards: true, bankerCards: true,
    },
  });
}

async function ensureDealOnReveal(tx: Prisma.TransactionClient, roundId: string) {
  const r = await tx.round.findUnique({
    where: { id: roundId },
    select: {
      id: true, phase: true, playerCards: true, bankerCards: true,
      playerTotal: true, bankerTotal: true, outcome: true,
      playerPair: true, bankerPair: true, anyPair: true, perfectPair: true,
    },
  });
  if (!r) return;

  // 只在 REVEALING 且尚未有牌時，才會發牌
  if (r.phase === "REVEALING" && (!r.playerCards || !r.bankerCards)) {
    const dealt = dealBaccarat();
    await tx.round.update({
      where: { id: roundId },
      data: {
        playerCards: dealt.player as any,
        bankerCards: dealt.banker as any,
        playerTotal: dealt.playerTotal,
        bankerTotal: dealt.bankerTotal,
        outcome: asAny(dealt.outcome),
        playerPair: dealt.playerPair,
        bankerPair: dealt.bankerPair,
        anyPair: dealt.anyPair,
        perfectPair: dealt.perfectPair,
      },
    });
  }
}

async function settleRoundTx(tx: Prisma.TransactionClient, roundId: string) {
  const r = await tx.round.findUnique({
    where: { id: roundId },
    select: {
      id: true, outcome: true,
      playerPair: true, bankerPair: true,
    },
  });
  if (!r || !r.outcome) return;

  const bets = await tx.bet.findMany({
    where: { roundId },
    select: { id: true, userId: true, side: true, amount: true },
  });

  for (const b of bets) {
    const ratio = payoutRatio(asAny(b.side), { outcome: asAny(r.outcome), playerPair: r.playerPair || false, bankerPair: r.bankerPair || false });
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
        memo: `派彩 中獎`,
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

// === Handler ===
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const roomCode = String(url.searchParams.get("room") || "R60").toUpperCase();
    const me = await getUser(req);

    const room = await prisma.room.findFirst({
      where: { code: asAny(roomCode) },
      select: { id: true, code: true, name: true, durationSeconds: true },
    });
    if (!room) return noStoreJson({ error: "房間不存在" }, 404);

    const dayStartUtc = taipeiDayStart(new Date());

    // 當日最新局
    let round = await prisma.round.findFirst({
      where: { roomId: room.id, day: dayStartUtc },
      orderBy: [{ roundSeq: "desc" }],
      select: {
        id: true, createdAt: true, startedAt: true, roundSeq: true, phase: true,
        outcome: true, playerTotal: true, bankerTotal: true,
        playerCards: true, bankerCards: true,
      },
    });
    if (!round) {
      round = await prisma.$transaction((tx) => createNextRoundTx(tx, room.id, dayStartUtc));
    }

    const now = Date.now();
    const startMs = new Date(round.startedAt ?? round.createdAt).getTime();

    // 時間參數
    const revealDuration = 8;      // 開牌總秒數（可以調長）
    const revealStepMs = 1200;     // 每張牌間隔
    const betLeft = Math.max(0, room.durationSeconds - Math.floor((now - startMs) / 1000));

    let phase: "BETTING" | "REVEALING" | "SETTLED" = (round.phase as any) || "BETTING";
    let secLeft = 0;

    // 下注階段
    if (phase === "BETTING") {
      secLeft = betLeft;
      if (secLeft === 0) {
        await prisma.$transaction(async (tx) => {
          await tx.round.update({ where: { id: round!.id }, data: { phase: asAny("REVEALING") } });
          await ensureDealOnReveal(tx, round!.id); // 轉入 REVEALING 時就發牌
        });
        phase = "REVEALING";
        secLeft = revealDuration;
      }
    }

    // 開牌階段
    if (phase === "REVEALING") {
      const elapsed = Math.max(0, Math.floor((now - startMs) / 1000) - room.durationSeconds);
      secLeft = Math.max(0, revealDuration - elapsed);

      // 確保已經有牌（防重）
      await prisma.$transaction(async (tx) => ensureDealOnReveal(tx, round!.id));

      if (secLeft === 0) {
        await prisma.$transaction(async (tx) => settleRoundTx(tx, round!.id));
        phase = "SETTLED";
      }
    }

    // 結算後 → 準備下一局
    if (phase === "SETTLED") {
      const hasNext = await prisma.round.findFirst({
        where: { roomId: room.id, day: dayStartUtc, roundSeq: asAny({ gt: round.roundSeq }) },
        select: { id: true },
      });
      if (!hasNext) {
        await prisma.$transaction((tx) => createNextRoundTx(tx, room.id, dayStartUtc));
      }
      // 取最新（可能已經是下一局了）
      round = await prisma.round.findFirst({
        where: { roomId: room.id, day: dayStartUtc },
        orderBy: [{ roundSeq: "desc" }],
        select: {
          id: true, createdAt: true, startedAt: true, roundSeq: true, phase: true,
          outcome: true, playerTotal: true, bankerTotal: true,
          playerCards: true, bankerCards: true,
        },
      });

      phase = (round!.phase as any) || "BETTING";
      const st = new Date(round!.startedAt ?? round!.createdAt).getTime();
      if (phase === "BETTING") secLeft = Math.max(0, room.durationSeconds - Math.floor((Date.now() - st) / 1000));
      else if (phase === "REVEALING") {
        const revElapsed = Math.max(0, Math.floor((Date.now() - st) / 1000) - room.durationSeconds);
        secLeft = Math.max(0, revealDuration - revElapsed);
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

    // === 「逐張揭示」資訊 ===
    const playerCards: string[] = asAny(round.playerCards) ?? [];
    const bankerCards: string[] = asAny(round.bankerCards) ?? [];

    // 揭示順序
    const order = ["P1", "B1", "P2", "B2", "P3", "B3"];
    // 目前該揭示到第幾張（REVEALING 才遞增，BETTING=0；SETTLED=全部）
    let showCount = 0;
    if (phase === "REVEALING") {
      const revealElapsedMs = Math.max(0, (Date.now() - startMs) - room.durationSeconds * 1000);
      showCount = Math.min(order.length, Math.floor(revealElapsedMs / revealStepMs) + 1);
    } else if (phase === "SETTLED") {
      showCount = order.length;
    }

    return noStoreJson({
      room: { code: room.code, name: room.name, durationSeconds: room.durationSeconds },
      day: dayStartUtc,
      roundId: round!.id,
      roundSeq: round!.roundSeq,
      phase,
      secLeft,
      // 結果只有在 SETTLED 才給值（與你前端原有邏輯相容）
      result:
        phase === "SETTLED"
          ? {
              outcome: round!.outcome ?? null,
              p: round!.playerTotal ?? null,
              b: round!.bankerTotal ?? null,
            }
          : null,
      // 逐張揭示需要的資料
      cards: {
        player: playerCards, // 0..2
        banker: bankerCards, // 0..2
      },
      reveal: {
        order,         // ["P1","B1","P2","B2","P3","B3"]
        showCount,     // 目前要翻到第幾張
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
