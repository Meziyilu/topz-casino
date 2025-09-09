import { NextRequest, NextResponse } from "next/server";
import type { RoomCode } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getRoomInfo } from "@/services/baccarat.service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const room = (url.searchParams.get("room") || "R60").toUpperCase() as RoomCode;
  const seconds = Number(url.searchParams.get("seconds") || 60);

  const rc = await getRoomInfo(room).catch(() => null);
  if (!rc) return NextResponse.json({ ok:false, error:"ROOM_NOT_FOUND" }, { status:400 });

  // 關閉上一局（若還在進行就標註 SETTLED，不派彩；單純防髒）
  const last = await prisma.round.findFirst({ where:{ room }, orderBy:{ startedAt:"desc" } });
  if (last && last.phase !== "SETTLED") {
    await prisma.round.update({ where:{ id: last.id }, data:{ phase:"SETTLED", outcome: last.outcome ?? "TIE" } });
  }

  const created = await prisma.round.create({
    data: { room, phase:"BETTING", startedAt: new Date() },
  });

  return NextResponse.json({ ok:true, room, roundId: created.id, seconds });
}
