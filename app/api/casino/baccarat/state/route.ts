// app/api/casino/baccarat/state/route.ts
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyJWT } from "@/lib/jwt";

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

// 解析 cookie 的 token
function readTokenFromHeaders(req: Request): string | null {
  const raw = req.headers.get("cookie");
  if (!raw) return null;
  const m = raw.match(/(?:^|;\s*)token=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

async function getUser(req: Request) {
  const token = readTokenFromHeaders(req);
  if (!token) return null;
  try {
    const payload = await verifyJWT(token);
    const me = await prisma.user.findUnique({
      where: { id: String(payload.sub) },
      select: { id: true, email: true, isAdmin: true },
    });
    return me;
  } catch {
    return null;
  }
}

// 以台北時區的“當天”回傳 UTC 起訖
function taipeiDayRange(date = new Date()) {
  const utcMs = date.getTime();
  const taipeiMs = utcMs + 8 * 3600_000;
  const dayStartTaipei = Math.floor(taipeiMs / 86_400_000) * 86_400_000;
  const startUtc = new Date(dayStartTaipei - 8 * 3600_000);
  const endUtc = new Date(startUtc.getTime() + 86_400_000);
  return { startUtc, endUtc };
}

// 結算（這裡示意，實際可補發牌/派彩）
async function settleRoundTx(tx: typeof prisma, roundId: string) {
  await tx.round.update({
    where: { id: roundId },
    data: { phase: "SETTLED" as any, settledAt: new Date() },
  });
}

// 建立下一局（每日序號）
async function createNextRoundTx(tx: typeof prisma, roomId: string, startUtc: Date) {
  const latest = await tx.round.findFirst({
    where: { roomId, startedAt: { gte: startUtc } },
    orderBy: [{ roundSeq: "desc" }],
    select: { roundSeq: true },
  });
  const nextSeq = (latest?.roundSeq ?? 0) + 1;
  const now = new Date();
  return tx.round.create({
    data: {
      roomId,
      day: startUtc,
      roundSeq: nextSeq,
      phase: "BETTING" as any,
      createdAt: now,
      startedAt: now,
    },
  });
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const roomCode = String(url.searchParams.get("room") || "R60").toUpperCase();
    const force = String(url.searchParams.get("force") || "");

    const me = await getUser(req);

    // 1) 房間
    const room = await prisma.room.findFirst({
      where: { code: roomCode as any },
      select: { id: true, code: true, name: true, durationSeconds: true },
    });
    if (!room) return noStoreJson({ error: "房間不存在" }, 404);

    const { startUtc, endUtc } = taipeiDayRange(new Date());

    // 2) 管理員強制重啟（將當日局數結束，開下一局為下注中）
    if (force === "restart") {
      if (!me?.isAdmin) return noStoreJson({ error: "需要管理員權限" }, 403);
      await prisma.$transaction(async (tx) => {
        await tx.round.updateMany({
          where: { roomId: room.id, startedAt: { gte: startUtc, lt: endUtc } },
          data: { phase: "SETTLED" as any, settledAt: new Date() },
        });
        await createNextRoundTx(tx, room.id, startUtc);
      });
    }

    // 3) 取當日最新一局；若沒有就開第一局
    let round = await prisma.round.findFirst({
      where: { roomId: room.id, startedAt: { gte: startUtc, lt: endUtc } },
      orderBy: [{ roundSeq: "desc" }],
      select: {
        id: true,
        day: true,
        roundSeq: true,
        phase: true,
        startedAt: true,
        createdAt: true,
        settledAt: true,
        outcome: true,
        playerTotal: true,
        bankerTotal: true,
      },
    });

    if (!round) {
      round = await prisma.$transaction(async (tx) => {
        const created = await createNextRoundTx(tx, room.id, startUtc);
        return created;
      });
    }

    // 4) 依階段計時/轉換
    const now = new Date();
    const betDuration = room.durationSeconds; // 30/60/90
    const revealDuration = 5; // 開牌動畫 5s
    let phase: Phase = (round.phase as any) || "BETTING";
    let secLeft = 0;

    const startedAt = round.startedAt ?? round.createdAt ?? now;

    if (phase === "BETTING") {
      const elapsed = Math.floor((now.getTime() - new Date(startedAt).getTime()) / 1000);
      secLeft = Math.max(0, betDuration - elapsed);
      if (secLeft === 0) {
        await prisma.$transaction(async (tx) => {
          await tx.round.update({
            where: { id: round!.id },
            data: { phase: "REVEALING" as any },
          });
        });
        phase = "REVEALING";
        secLeft = revealDuration;
      }
    }

    if (phase === "REVEALING") {
      const sinceStart = Math.floor((now.getTime() - new Date(startedAt).getTime()) / 1000);
      const revealElapsed = Math.max(0, sinceStart - betDuration);
      secLeft = Math.max(0, revealDuration - revealElapsed);
      if (secLeft === 0) {
        await prisma.$transaction(async (tx) => {
          await settleRoundTx(tx, round!.id);
        });
        phase = "SETTLED";
      }
    }

    if (phase === "SETTLED") {
      // 有 round 才能用 round.roundSeq；這裡 round 一定存在
      const hasNext = await prisma.round.findFirst({
        where: {
          roomId: room.id,
          startedAt: { gte: startUtc, lt: endUtc },
          roundSeq: { gt: round.roundSeq },
        },
        select: { id: true },
      });

      if (!hasNext) {
        await prisma.$transaction(async (tx) => {
          await createNextRoundTx(tx, room.id, startUtc);
        });
      }

      // 重新取最新一局
      round = await prisma.round.findFirst({
        where: { roomId: room.id, startedAt: { gte: startUtc, lt: endUtc } },
        orderBy: [{ roundSeq: "desc" }],
        select: {
          id: true,
          day: true,
          roundSeq: true,
          phase: true,
          startedAt: true,
          createdAt: true,
          settledAt: true,
          outcome: true,
          playerTotal: true,
          bankerTotal: true,
        },
      });

      // 更新 phase/secLeft 顯示
      phase = (round!.phase as any) || "BETTING";
      const st = round!.startedAt ?? round!.createdAt ?? now;
      if (phase === "BETTING") {
        const elapsed = Math.floor((now.getTime() - new Date(st).getTime()) / 1000);
        secLeft = Math.max(0, betDuration - elapsed);
      } else if (phase === "REVEALING") {
        const sinceStart2 = Math.floor((now.getTime() - new Date(st).getTime()) / 1000);
        const revealElapsed2 = Math.max(0, sinceStart2 - betDuration);
        secLeft = Math.max(0, revealDuration - revealElapsed2);
      } else {
        secLeft = 0;
      }
    }

    // 5) 我的投注（有登入才聚合）
    let myBets: Record<string, number> = {};
    if (me && round) {
      const rows = await prisma.bet.groupBy({
        by: ["side"],
        where: { userId: me.id, day: startUtc, roundSeq: round.roundSeq },
        _sum: { amount: true },
      });
      for (const r of rows) {
        (myBets as any)[r.side as any] = (r as any)._sum.amount ?? 0;
      }
    }

    // 6) 最近戰績（當日已結算）
    const recentRows = await prisma.round.findMany({
      where: {
        roomId: room.id,
        startedAt: { gte: startUtc, lt: endUtc },
        phase: "SETTLED" as any,
      },
      orderBy: [{ roundSeq: "desc" }],
      take: 20,
      select: { roundSeq: true, outcome: true, playerTotal: true, bankerTotal: true },
    });

    return noStoreJson({
      room: { code: room.code, name: room.name, durationSeconds: room.durationSeconds },
      day: startUtc,
      roundSeq: round!.roundSeq,
      phase,
      secLeft,
      result:
        phase === "SETTLED"
          ? {
              outcome: round!.outcome ?? null,
              p: round!.playerTotal ?? null,
              b: round!.bankerTotal ?? null,
            }
          : null,
      myBets,
      recent: recentRows.map((rr) => ({
        roundSeq: rr.roundSeq,
        outcome: rr.outcome,
        p: rr.playerTotal ?? 0,
        b: rr.bankerTotal ?? 0,
      })),
    });
  } catch (e: any) {
    return noStoreJson({ error: e?.message || "Server error" }, 500);
  }
}
