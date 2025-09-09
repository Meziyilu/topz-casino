import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { RoomCode } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const room = (url.searchParams.get("room") || "R60").toUpperCase() as RoomCode;

  const cur = await prisma.round.findFirst({ where:{ room }, orderBy:{ startedAt:"desc" } });
  if (!cur) return NextResponse.json({ ok:false, error:"NO_ROUND" }, { status:400 });
  if (cur.phase !== "BETTING") return NextResponse.json({ ok:false, error:"NOT_BETTING" }, { status:400 });

  await prisma.round.update({ where:{ id: cur.id }, data:{ phase:"REVEALING" } });
  return NextResponse.json({ ok:true, room, roundId: cur.id, phase:"REVEALING" });
}
