export const runtime = "nodejs";
// app/api/admin/rooms/reset/route.ts
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

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

// 台北當日 00:00 UTC
function taipeiDayStart(date = new Date()) {
  const utc = date.getTime();
  const tpe = utc + 8 * 3600_000;
  const tpeStart = Math.floor(tpe / 86_400_000) * 86_400_000;
  return new Date(tpeStart - 8 * 3600_000);
}

export async function POST(req: Request) {
  try {
    await requireAdmin(req);
    const body = await req.json().catch(() => ({}));
    const { room } = body || {};
    if (!room || !["R30", "R60", "R90"].includes(String(room))) {
      return noStoreJson({ error: "room 需為 R30 / R60 / R90" }, 400);
    }

    const roomRow = await prisma.room.findFirst({
      where: { code: room as any },
      select: { id: true, code: true },
    });
    if (!roomRow) return noStoreJson({ error: "房間不存在" }, 404);

    const dayStartUtc = taipeiDayStart(new Date());

    await prisma.$transaction(async (tx) => {
      await tx.round.updateMany({
        where: { roomId: roomRow.id, day: dayStartUtc, phase: { not: "SETTLED" as any } },
        data: { phase: "SETTLED" as any, settledAt: new Date() },
      });

      const latest = await tx.round.findFirst({
        where: { roomId: roomRow.id, day: dayStartUtc },
        orderBy: { roundSeq: "desc" },
        select: { roundSeq: true },
      });
      const nextSeq = (latest?.roundSeq ?? 0) + 1;
      const now = new Date();

      await tx.round.create({
        data: {
          roomId: roomRow.id,
          day: dayStartUtc,
          roundSeq: nextSeq,
          phase: "BETTING" as any,
          createdAt: now,
          startedAt: now,
        },
      });
    });

    return noStoreJson({ ok: true });
  } catch (e: any) {
    return noStoreJson({ error: e?.message || "Server error" }, e?.status || 500);
  }
}
