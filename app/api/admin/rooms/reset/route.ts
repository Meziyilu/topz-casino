// app/api/admin/rooms/reset/route.ts
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

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
function taipeiDayStart(date = new Date()) {
  const utc = date.getTime();
  const tpe = utc + 8 * 3600_000;
  const tpeStart = Math.floor(tpe / 86_400_000) * 86_400_000;
  return new Date(tpeStart - 8 * 3600_000);
}
async function createNextRoundTx(tx: any, roomId: string, dayStartUtc: Date) {
  const latest = await tx.round.findFirst({
    where: { roomId, day: dayStartUtc },
    orderBy: [{ roundSeq: "desc" }],
    select: { roundSeq: true },
  });
  const nextSeq = (latest?.roundSeq ?? 0) + 1;
  const now = new Date();
  return tx.round.create({
    data: {
      roomId, day: dayStartUtc, roundSeq: nextSeq,
      phase: asAny("BETTING"), createdAt: now, startedAt: now,
    },
    select: { id: true, roundSeq: true },
  });
}

export async function POST(req: Request) {
  try {
    await requireAdmin(req);

    const { room: roomCode } = await req.json();
    if (!roomCode) return noStoreJson({ error: "room 必填" }, 400);

    const room = await prisma.room.findFirst({
      where: { code: asAny(String(roomCode).toUpperCase()) },
      select: { id: true, code: true },
    });
    if (!room) return noStoreJson({ error: "房間不存在" }, 404);

    const dayStartUtc = taipeiDayStart(new Date());

    await prisma.$transaction(async (tx: any) => {
      await tx.round.updateMany({
        where: { roomId: room.id, day: dayStartUtc },
        data: { phase: asAny("SETTLED"), settledAt: new Date() },
      });
      await createNextRoundTx(tx, room.id, dayStartUtc);
    });

    return noStoreJson({ ok: true });
  } catch (e: any) {
    return noStoreJson({ error: e?.message || "Server error" }, 500);
  }
}
