// app/api/casino/sicbo/my-bets/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { SicBoRoomCode } from "@prisma/client";
import { getOrRotateRound } from "@/services/sicbo.service";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const room = (searchParams.get("room") as SicBoRoomCode) ?? "SB_R30";
  const userId = searchParams.get("userId"); // ⚠️ 無驗證：從 query 帶
  const roundId = searchParams.get("roundId");

  const round = roundId
    ? await prisma.sicBoRound.findUnique({ where: { id: roundId } })
    : (await getOrRotateRound(room)).round;

  if (!round || !userId) return NextResponse.json({ roundId: round?.id, items: [] });

  const items = await prisma.sicBoBet.findMany({
    where: { userId, roundId: round.id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ roundId: round.id, items });
}
