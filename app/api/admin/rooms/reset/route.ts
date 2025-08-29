export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import type { Prisma, RoomCode } from "@prisma/client";

function taipeiDayStart(date = new Date()) {
  const utcMs = date.getTime();
  const tpeMs = utcMs + 8 * 3600_000;
  const tpeDay0 = Math.floor(tpeMs / 86_400_000) * 86_400_000;
  return new Date(tpeDay0 - 8 * 3600_000);
}

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
      phase: "BETTING",
      createdAt: now,
      startedAt: now,
    },
    select: { id: true },
  });
}

/** POST { code?: "R30"|"R60"|"R90" }；缺省表示全部房間 */
export async function POST(req: Request) {
  try {
    await requireAdmin(req);
    const day = taipeiDayStart(new Date());
    const body = await req.json().catch(() => ({}));
    const code: RoomCode | undefined = body?.code;

    const rooms = code
      ? await prisma.room.findMany({ where: { code } })
      : await prisma.room.findMany();

    if (!rooms.length) {
      return NextResponse.json({ error: "找不到房間" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      for (const r of rooms) {
        await tx.round.updateMany({
          where: { roomId: r.id, day, phase: { in: ["BETTING", "REVEALING"] } },
          data: { phase: "SETTLED", settledAt: new Date() },
        });
        await createNextRoundTx(tx, r.id, day);
      }
    });

    return NextResponse.json({ ok: true, rooms: rooms.map((r) => r.code) });
  } catch (e: any) {
    const status = e?.status || 500;
    return NextResponse.json({ error: e.message || "Server error" }, { status });
  }
}
