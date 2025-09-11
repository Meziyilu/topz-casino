import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { RoomKey } from "@/lib/sicbo/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const room = (req.nextUrl.searchParams.get("room") || "R60") as RoomKey;
  const items = await prisma.sicboRound.findMany({
    where: { room },
    orderBy: { startsAt: "desc" },
    take: 50,
    select: { daySeq: true, die1: true, die2: true, die3: true, sum: true, isTriple: true }
  });
  return NextResponse.json({ items });
}
