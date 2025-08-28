// app/api/casino/baccarat/state/route.ts
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyJWT } from "@/lib/jwt";

// 小工具：no-store 回應
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

// 解析 cookie 拿 token
function readTokenFromHeaders(req: Request): string | null {
  const raw = req.headers.get("cookie");
  if (!raw) return null;
  const m = raw.match(/(?:^|;\s*)token=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

// 驗使用者（可為 null）
async function getUser(req: Request) {
  const token = readTokenFromHeaders(req);
  if (!token) return null;
  try {
    const payload = await verifyJWT(token);
    const me = await prisma.user.findUnique({
      where: { id: String(payload.sub) },
      select: { id: true, email: true },
    });
    return me;
  } catch {
    return null;
  }
}

// 取得台北當日起訖（回傳 UTC 時間，for 存在 DB 的 timestamp）
function taipeiDayRange(date = new Date()) {
  // Asia/Taipei = UTC+8
  const tzOffsetMin = -480; // 用於 toLocaleString 不可靠，這裡用計算
  const utc = date;
  // 取今天 (台北) 00:00 的 UTC 時刻
  const taipeiNowMs = utc.getTime() + 8 * 60 * 60 * 1000;
  const taipeiMidnightMs =
    Math.floor(taipeiNowMs / (24 * 3600 * 1000)) * 24 * 3600 * 1000;
  const startUtc = new Date(taipeiMidnightMs - 8 * 3600 * 1000);
  const endUtc = new Date(startUtc.getTime() + 24 * 3600 * 1000);
  return { startUtc, endUtc };
}

type Phase = "BETTING" | "REVEALING" | "SETTLED";

//（可選）結算用：這裡只占位
async function settleRoundTx(tx: typeof prisma, roundId: string) {
  // 你原本的結算/派彩邏輯放這裡
  await tx.round.update({
    where: { id: roundId },
    data: { phase: "SETTLED" as any, settledAt: new Date() },
  });
}

async function createNextRoundTx(
  tx: typeof prisma,
  roomId: string,
  startUtc: Date
) {
  // 找當日最大 roundSeq
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

    // 2) 強制重啟（僅管理員）
    if (force === "restart") {
      // 確認使用者 & 權限
      const admin = me
        ? await prisma.user.findUnique({
            where: { id: me.id },
            select: { isAdmin: true },
          })
        : null;
      if (!admin?.isAdmin) return noStoreJson({ error: "需要管理員權限" }, 403);

      await prisma.$transaction(async (tx) => {
        // 將當日現有回合全部 SETTLED
        await tx.round.updateMany({
          where: { roomId: room.id, startedAt: { gte: startUtc, lt: endUtc } },
          data: { phase: "SETTLED" as any, settledAt: new Date() },
        });
        // 新開一局 roundSeq = 當日最大 + 1
        await createNextRoundTx(tx, room.id, startUtc);
      });

      // 重新查狀態
    }

    // 3) 找最新一局（當日最大序）
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

    // 若沒有任何當日回合，自動開第一局
    if (!round) {
      round = await prisma.$transaction(async (tx) => {
        const created = await createNextRoundTx(tx, room.id, startUtc);
        return created;
      });
    }

    // 4) 根據階段更新 & 倒數
    const now = new Date();
    const betDuration = room.durationSeconds; // 下注秒數
    const revealDuration = 5; // 開牌動畫秒數（可調）

    let phase: Phase = (round.phase as any) || "BETTING";
    let secLeft = 0;

    if (phase === "BETTING") {
      const elapsed = Math.floor(
        (now.getTime() - new Date(round.startedAt!).getTime()) / 1000
      );
      secLeft = Math.max(0, betDuration - elapsed);

      // 下注時間到，轉 REVEALING
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
      const sinceReveal = Math.floor(
        (now.getTime() - new Date(round.startedAt!).getTime()) / 1000
      );
      // 換算：已經經過的總秒數 - 下注時長 = 進入 REVEALING 的秒數
      const revealElapsed = Math.max(0, sinceReveal - betDuration);
      secLeft = Math.max(0, revealDuration - revealElapsed);

      if (secLeft === 0) {
        // 結算本局 -> 進入 SETTLED，接著看是否需要開下一局
        await prisma.$transaction(async (tx) => {
          await settleRoundTx(tx, round!.id);
        });
        phase = "SETTLED";
      }
    }

    if (phase === "SETTLED") {
      // 查是否已有更大的 roundSeq（當日）
      let hasNext: { id: string } | null = null;
      if (round) {
        hasNext = await prisma.round.findFirst({
          where: {
            roomId: room.id,
            startedAt: { gte: startUtc, lt: endUtc },
            roundSeq: { gt: round.roundSeq },
          },
          select: { id: true },
        });
      } else {
        hasNext = null;
      }

      if (!hasNext) {
        // 開下一局
        await prisma.$transaction(async (tx) => {
          await createNextRoundTx(tx, room.id, startUtc);
        });
      }

      // 重新抓最新一局（一定存在）
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

      phase = (round!.phase as any) || "BETTING";
      if (phase === "BETTING") {
        const elapsed = Math.floor(
          (now.getTime() - new Date(round!.startedAt!).getTime()) / 1000
        );
        secLeft = Math.max(0, betDuration - elapsed);
      } else if (phase === "REVEALING") {
        const sinceReveal = Math.floor(
          (now.getTime() - new Date(round!.startedAt!).getTime()) / 1000
        );
        const revealElapsed = Math.max(0, sinceReveal - betDuration);
        secLeft = Math.max(0, revealDuration - revealElapsed);
      } else {
        secLeft = 0;
      }
    }

    // 5) 聚合我的投注（可選，若沒有登入就回空物件）
    let myBets: Record<string, number> = {};
    if (me) {
      const rows = await prisma.bet.groupBy({
        by: ["side"],
        where: {
          userId: me.id,
          day: startUtc,
          roundSeq: round!.roundSeq,
        },
        _sum: { amount: true },
      });
      for (const row of rows) {
        (myBets as any)[row.side as any] = (row as any)._sum.amount ?? 0;
      }
    }

    // 6) 近期戰績（取最近 20 局已結算）
    const recentRows = await prisma.round.findMany({
      where: {
        roomId: room.id,
        startedAt: { gte: startUtc, lt: endUtc },
        phase: "SETTLED" as any,
      },
      orderBy: [{ roundSeq: "desc" }],
      take: 20,
      select: {
        roundSeq: true,
        outcome: true,
        playerTotal: true,
        bankerTotal: true,
      },
    });

    return noStoreJson({
      room: {
        code: room.code,
        name: room.name,
        durationSeconds: room.durationSeconds,
      },
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
