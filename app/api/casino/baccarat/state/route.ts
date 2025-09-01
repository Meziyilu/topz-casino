// app/api/casino/baccarat/state/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyRequest } from "@/lib/jwt";
import type { Prisma } from "@prisma/client";
import { dealRound } from "@/lib/baccarat";

type RoundPhase = Prisma.$Enums.RoundPhase;
type RoundOutcome = Prisma.$Enums.RoundOutcome;
type BetSide = Prisma.$Enums.BetSide;
type RoomCode = Prisma.$Enums.RoomCode;
type LedgerType = Prisma.$Enums.LedgerType;
type BalanceTarget = Prisma.$Enums.BalanceTarget;

function noStoreJson<T>(payload: T, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

// 台北日 00:00（用 UTC 儲存）
function taipeiDayStart(date = new Date()) {
  const utc = date.getTime();
  const tpe = utc + 8 * 3600_000;
  const tpeStart = Math.floor(tpe / 86_400_000) * 86_400_000;
  return new Date(tpeStart - 8 * 3600_000);
}

// ----------------- 賠率/派彩：與排行榜一致（含本金） -----------------
function getReturns() {
  const noComm = (process.env.TOPZ_BANKER_NO_COMMISSION || "false").toLowerCase() === "true";
  const tieOdds = Number(process.env.TOPZ_TIE_ODDS || 8);
  const pairOdds = Number(process.env.TOPZ_PAIR_ODDS || 11);
  return {
    PLAYER_RETURN: 2,
    BANKER_RETURN: noComm ? 2 : 1.95,
    TIE_RETURN: 1 + tieOdds,
    PAIR_RETURN: 1 + pairOdds,
  };
}

/** 計算單注派彩（含本金）；輸=0；和局推注(押閒/莊遇和)退本金(1x) */
function computePayout(
  side: BetSide | string,
  outcome: RoundOutcome | string | null,
  flags: { playerPair?: boolean | null; bankerPair?: boolean | null },
  amount: number
): number {
  const { PLAYER_RETURN, BANKER_RETURN, TIE_RETURN, PAIR_RETURN } = getReturns();

  if (side === "PLAYER" && outcome === "PLAYER") return Math.round(amount * PLAYER_RETURN);
  if (side === "BANKER" && outcome === "BANKER") return Math.floor(amount * BANKER_RETURN);
  if (side === "TIE" && outcome === "TIE") return Math.round(amount * TIE_RETURN);

  // 和局推注：押閒/莊遇到 outcome=TIE → 退本金
  if ((side === "PLAYER" || side === "BANKER") && outcome === "TIE") return amount;

  if (side === "PLAYER_PAIR" && flags.playerPair) return Math.round(amount * PAIR_RETURN);
  if (side === "BANKER_PAIR" && flags.bankerPair) return Math.round(amount * PAIR_RETURN);

  return 0;
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
      phase: "BETTING" as RoundPhase,
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
async function ensureCardsOnReveal(tx: Prisma.TransactionClient, roundId: string) {
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

  const result = dealRound(); // { outcome, playerTotal, bankerTotal, playerPair, bankerPair, anyPair, perfectPair, playerCards, bankerCards }
  await tx.round.update({
    where: { id: roundId },
    data: {
      outcome: result.outcome as RoundOutcome,
      playerTotal: result.playerTotal,
      bankerTotal: result.bankerTotal,
      playerPair: result.playerPair ?? false,
      bankerPair: result.bankerPair ?? false,
      anyPair: result.anyPair ?? false,
      perfectPair: result.perfectPair ?? false,
      playerCards: (result.playerCards ?? []) as unknown as Prisma.InputJsonValue,
      bankerCards: (result.bankerCards ?? []) as unknown as Prisma.InputJsonValue,
    },
  });
}

// 結算（不重發牌）— 已調整為「含本金返還」
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
    const payout = computePayout(
      String(b.side),
      String(r.outcome),
      { playerPair: r.playerPair, bankerPair: r.bankerPair },
      b.amount
    );

    if (payout > 0) {
      const after = await tx.user.update({
        where: { id: b.userId },
        data: { balance: { increment: payout } },
        select: { balance: true, bankBalance: true },
      });
      await tx.ledger.create({
        data: {
          userId: b.userId,
          type: "PAYOUT" as LedgerType,
          target: "WALLET" as BalanceTarget,
          delta: payout,
          memo: `派彩 ${String(b.side)} +${payout}`,
          balanceAfter: after.balance,
          bankAfter: after.bankBalance,
        },
      });
    }
  }

  await tx.round.update({
    where: { id: roundId },
    data: { phase: "SETTLED" as RoundPhase, settledAt: new Date() },
  });
}

// ----------------- Handler -----------------
export async function GET(req: Request) {
  try {
    // 驗證（可選，未登入也可查狀態；若登入才回傳 myBets 與 balance）
    const auth = await verifyRequest(req);
    const userId =
      (auth as { userId?: string; sub?: string } | null)?.userId ??
      (auth as { sub?: string } | null)?.sub ??
      null;

    const me = userId
      ? await prisma.user.findUnique({
          where: { id: String(userId) },
          select: { id: true, email: true, isAdmin: true, balance: true },
        })
      : null;

    const url = new URL(req.url);
    const roomCodeParam = String(url.searchParams.get("room") || "R60").toUpperCase();
    const roomCode = (["R30", "R60", "R90"].includes(roomCodeParam) ? roomCodeParam : "R60") as unknown as RoomCode;
    const force = String(url.searchParams.get("force") || "");

    // 找房間
    const room = await prisma.room.findFirst({
      where: { code: roomCode },
      select: { id: true, code: true, name: true, durationSeconds: true },
    });
    if (!room) return noStoreJson({ error: "房間不存在" }, 404);

    const dayStartUtc = taipeiDayStart(new Date());

    // 管理員強制重啟（結掉當日局 -> 新開）
    if (force === "restart") {
      if (!me?.isAdmin) return noStoreJson({ error: "需要管理員權限" }, 403);
      await prisma.$transaction(async (tx) => {
        await tx.round.updateMany({
          where: { roomId: room.id, day: dayStartUtc, phase: { not: "SETTLED" as RoundPhase } },
          data: { phase: "SETTLED" as RoundPhase, settledAt: new Date() },
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
      round = await prisma.$transaction(async (tx) => createNextRoundTx(tx, room!.id, dayStartUtc));
    }

    // 狀態推進與倒數
    const now = Date.now();
    const startMs = new Date(round.startedAt ?? round.createdAt).getTime();
    const betLeft = Math.max(0, room.durationSeconds - Math.floor((now - startMs) / 1000));
    const revealDuration = 6; // 開牌展示秒數

    let phase: RoundPhase = (round.phase as RoundPhase) || ("BETTING" as RoundPhase);
    let secLeft = 0;

    if (phase === "BETTING") {
      secLeft = betLeft;
      if (secLeft === 0) {
        await prisma.$transaction(async (tx) => {
          await tx.round.update({ where: { id: round!.id }, data: { phase: "REVEALING" as RoundPhase } });
          await ensureCardsOnReveal(tx, round!.id);
        });
        phase = "REVEALING";
        secLeft = revealDuration;

        // 重新撈含牌面
        round = (await prisma.round.findUnique({
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
        }))!;
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
        where: { roomId: room.id, day: dayStartUtc, roundSeq: { gt: round.roundSeq } },
        select: { id: true },
      });
      if (!hasNext) {
        await prisma.$transaction(async (tx) => createNextRoundTx(tx, room.id, dayStartUtc));
      }

      // 撈最新一局
      round = (await prisma.round.findFirst({
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
      }))!;

      phase = (round.phase as RoundPhase) || ("BETTING" as RoundPhase);
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

    // 我的投注（以 roundId 聚合）
    const myBets: Partial<Record<BetSide, number>> = {};
    if (me && round) {
      const rows = (await prisma.bet.groupBy({
        by: ["side"],
        where: { userId: me.id, roundId: round.id },
        _sum: { amount: true },
      })) as Array<{ side: BetSide; _sum: { amount: number | null } }>;

      for (const r of rows) {
        myBets[r.side] = r._sum.amount ?? 0;
      }
    }

    // 今日近 20 局（已結算）
    const recentRows = await prisma.round.findMany({
      where: { roomId: room.id, day: dayStartUtc, phase: "SETTLED" as RoundPhase },
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
              outcome: (round.outcome ?? null) as RoundOutcome | null,
              p: round.playerTotal ?? null,
              b: round.bankerTotal ?? null,
            }
          : null,
      cards:
        phase !== "BETTING"
          ? {
              player: ((round.playerCards as unknown) ?? []) as string[],
              banker: ((round.bankerCards as unknown) ?? []) as string[],
            }
          : undefined,
      myBets,
      balance: me?.balance ?? null,
      recent: recentRows.map((r) => ({
        roundSeq: r.roundSeq,
        outcome: r.outcome as RoundOutcome,
        p: r.playerTotal ?? 0,
        b: r.bankerTotal ?? 0,
      })),
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    return noStoreJson({ error: message }, 500);
  }
}
