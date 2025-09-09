import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ROOMS, getConfig, getActiveRound } from "../_utils";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const room = (url.searchParams.get("room") || "").toUpperCase();
  if (!ROOMS.includes(room as any)) return NextResponse.json({ error: "BAD_ROOM" }, { status: 400 });

  const cfg = getConfig(room as any);
  const active = await getActiveRound(room as any);
  if (!active) return NextResponse.json({ error: "NO_ROUND" }, { status: 404 });
  if (active.phase !== "BETTING") return NextResponse.json({ error: "NOT_BETTING" }, { status: 409 });

  const now = new Date();
  const revealEnd = new Date(now.getTime() + (cfg.revealSeconds ?? 5) * 1000);
  const upd = await prisma.round.update({
    where: { id: active.id },
    data: { phase: "REVEALING", endsAt: revealEnd },
    select: { id: true, phase: true, endsAt: true },
  });
  return NextResponse.json({ ok: true, round: upd });
}
