export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import type { Prisma } from "@prisma/client";

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

// 台北當日 00:00（UTC 表示）
function taipeiDayStart(date = new Date()) {
  const utc = date.getTime();
  const tpe = utc + 8 * 3600_000;
  const tpeStart = Math.floor(tpe / 86_400_000) * 86_400_000;
  return new Date(tpeStart - 8 * 3600_000);
}

async function createNextRoundTx(tx: Prisma.TransactionClient, roomId: string, dayStartUtc: Date) {
  const last = await tx.round.findFirst({
    where: { roomId, day: dayStartUtc },
    orderBy: { roundSeq: "desc" },
    select: { roundSeq: true },
  });
  const now = new Date();
  return tx.round.create({
    data: {
      roomId,
      day: dayStartUtc,
      roundSeq: (last?.roundSeq ?? 0) + 1,
      phase: "BETTING" as any,
      createdAt: now,
      startedAt: now,
    },
    select: { id: true, roundSeq: true },
  });
}

export async function POST(req: Request) {
  try {
    await requireAdmin(req);
    const body = await req.json().catch(() => ({}));
    const roomCode = String(body?.roomCode || "").toUpperCase();
    if (!roomCode) return noStoreJson({ error: "缺少 roomCode" }, 400);

    const room = await prisma.room.findUnique({ where: { code: roomCode as any }, select: { id: true, code: true } });
    if (!room) return noStoreJson({ error: "房間不存在" }, 404);

    const dayStartUtc = taipeiDayStart(new Date());

    await prisma.$transaction(async (tx) => {
      // 找出當日所有 roundId
      const roundIds = (
        await tx.round.findMany({
          where: { roomId: room.id, day: dayStartUtc },
          select: { id: true },
        })
      ).map((r) => r.id);

      // 刪當日下注與回合
      if (roundIds.length) {
        await tx.bet.deleteMany({ where: { roundId: { in: roundIds } } });
      }
      await tx.round.deleteMany({ where: { roomId: room.id, day: dayStartUtc } });

      // 開第一局
      await createNextRoundTx(tx, room.id, dayStartUtc);
    });

    return noStoreJson({ ok: true, roomCode });
  } catch (e: any) {
    return noStoreJson({ error: e?.message || "Server error" }, 500);
  }
}
