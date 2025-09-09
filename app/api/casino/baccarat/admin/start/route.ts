import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ROOMS, getConfig, getActiveRound } from "../_utils";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const room = (url.searchParams.get("room") || "").toUpperCase();
  const seconds = Number(url.searchParams.get("seconds") || "") || getConfig(room as any)?.betSeconds || 60;
  const ok = ROOMS.includes(room as any);
  if (!ok) return NextResponse.json({ error: "BAD_ROOM" }, { status: 400 });

  const created = await prisma.$transaction(async (tx) => {
    const active = await tx.round.findFirst({ where: { room: room as any, NOT: { phase: "SETTLED" } } });
    if (active) throw new Error("ROUND_ACTIVE");
    const now = new Date();
    return tx.round.create({
      data: { room: room as any, phase: "BETTING", startedAt: now, endsAt: new Date(now.getTime() + seconds * 1000) },
      select: { id: true, room: true, phase: true, startedAt: true, endsAt: true },
    });
  }).catch((e) => {
    if (String(e?.message) === "ROUND_ACTIVE") return null;
    throw e;
  });

  if (!created) return NextResponse.json({ error: "ROUND_ACTIVE" }, { status: 409 });
  return NextResponse.json({ ok: true, round: created });
}
