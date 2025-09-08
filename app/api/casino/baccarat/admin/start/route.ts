import { NextRequest, NextResponse } from "next/server";
import type { RoomCode } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getRoomInfo } from "@/services/baccarat.service";

export const dynamic = "force-dynamic";

function assertAdmin(req: NextRequest) {
  const env = process.env.ADMIN_TOKEN?.trim();
  const fromHeader = req.headers.get("x-admin-token")?.trim();
  const fromQuery = new URL(req.url).searchParams.get("token")?.trim();
  if (!env) return;
  if (fromHeader !== env && fromQuery !== env) throw new Error("UNAUTHORIZED");
}

export async function POST(req: NextRequest) {
  try {
    assertAdmin(req);
    const url = new URL(req.url);
    const room = (url.searchParams.get("room") || "R30").toUpperCase() as RoomCode;
    const seconds = Number(url.searchParams.get("seconds") || 0);
    const info = await getRoomInfo(room);
    const secs = seconds > 0 ? seconds : info.secondsPerRound || 60;

    const now = new Date();
    const created = await prisma.round.create({
      data: { room, phase: "BETTING", startedAt: now, endsAt: new Date(now.getTime() + secs * 1000) } as any,
      select: { id: true },
    });
    return NextResponse.json({ ok: true, id: created.id, secs });
  } catch (e: any) {
    const msg = e?.message || "SERVER_ERROR";
    return NextResponse.json({ ok: false, error: msg }, { status: msg === "UNAUTHORIZED" ? 401 : 500 });
  }
}
