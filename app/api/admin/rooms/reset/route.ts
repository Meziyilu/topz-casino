// app/api/admin/rooms/reset/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import type { Prisma } from "@prisma/client";

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

// 台北當日 00:00（以 UTC 儲存）
function taipeiDayStart(date = new Date()) {
  const utc = date.getTime();
  const tpe = utc + 8 * 3600_000;
  const tpeStart = Math.floor(tpe / 86_400_000) * 86_400_000;
  return new Date(tpeStart - 8 * 3600_000);
}

type RoomParam = "R30" | "R60" | "R90";

export async function POST(req: Request) {
  try {
    const gate = await requireAdmin(req);
    if (!gate.ok) return gate.res;

    const body = (await req.json().catch(() => ({}))) as { room?: unknown };
    const room = typeof body.room === "string" ? (body.room.toUpperCase() as RoomParam) : undefined;

    if (!room || !["R30", "R60", "R90"].includes(room)) {
      return noStoreJson({ error: "room 需為 R30 / R60 / R90" }, 400);
    }

    const roomRow = await prisma.room.findFirst({
      where: { code: room as Prisma.$Enums.RoomCode },
      select: { id: true, code: true },
    });
    if (!roomRow) return noStoreJson({ error: "房間不存在" }, 404);

    const dayStartUtc = taipeiDayStart(new Date());

    await prisma.$transaction(async (tx) => {
      // 結束當日未結算的局
      await tx.round.updateMany({
        where: {
          roomId: roomRow.id,
          day: dayStartUtc,
          phase: { not: Prisma.$Enums.RoundPhase.SETTLED },
        },
        data: {
          phase: Prisma.$Enums.RoundPhase.SETTLED,
          settledAt: new Date(),
        },
      });

      // 取得下一局序號
      const latest = await tx.round.findFirst({
        where: { roomId: roomRow.id, day: dayStartUtc },
        orderBy: { roundSeq: "desc" },
        select: { roundSeq: true },
      });
      const nextSeq = (latest?.roundSeq ?? 0) + 1;
      const now = new Date();

      // 新開一局（投注中）
      await tx.round.create({
        data: {
          roomId: roomRow.id,
          day: dayStartUtc,
          roundSeq: nextSeq,
          phase: Prisma.$Enums.RoundPhase.BETTING,
          createdAt: now,
          startedAt: now,
        },
      });
    });

    return noStoreJson({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    return noStoreJson({ error: msg }, 500);
  }
}
