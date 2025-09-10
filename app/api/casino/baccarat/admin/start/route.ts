// app/api/casino/baccarat/admin/start/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { RoomCode } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const Q = z.object({
  room: z.enum(["R30", "R60", "R90"] as const),
  seconds: z.coerce.number().int().positive().default(60),
});

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const parsed = Q.safeParse({
      room: url.searchParams.get("room") ?? "R60",
      seconds: url.searchParams.get("seconds") ?? "60",
    });
    if (!parsed.success) return NextResponse.json({ error: "BAD_QUERY" }, { status: 400 });
    const { room, seconds } = parsed.data;

    // 不允許在非 SETTLED 狀態時開新局
    const cur = await prisma.round.findFirst({
      where: { room: room as RoomCode },
      orderBy: { startedAt: "desc" },
    });
    if (cur && cur.phase !== "SETTLED") {
      return NextResponse.json({ error: "ROUND_ACTIVE" }, { status: 409 });
    }

    const created = await prisma.round.create({
      data: { room: room as any, phase: "BETTING", startedAt: new Date() },
      select: { id: true, room: true, phase: true, startedAt: true },
    });

    return NextResponse.json({ ok: true, round: created, seconds });
  } catch (e) {
    console.error("[admin/start] error:", e);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
