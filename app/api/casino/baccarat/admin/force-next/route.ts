// app/api/casino/baccarat/admin/force-next/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { RoomCode } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const Q = z.object({
  room: z.enum(["R30", "R60", "R90"] as const),
});

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const parsed = Q.safeParse({ room: url.searchParams.get("room") ?? "" });
    if (!parsed.success) return NextResponse.json({ error: "BAD_ROOM" }, { status: 400 });
    const { room } = parsed.data;

    // 直接把最新一局標記為 SETTLED（若尚未），然後開新局
    const cur = await prisma.round.findFirst({
      where: { room: room as RoomCode },
      orderBy: { startedAt: "desc" },
    });

    await prisma.$transaction(async (tx) => {
      if (cur && cur.phase !== "SETTLED") {
        await tx.round.update({ where: { id: cur.id }, data: { phase: "SETTLED" } });
      }
      await tx.round.create({
        data: { room: room as any, phase: "BETTING", startedAt: new Date() },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[admin/force-next] error:", e);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
