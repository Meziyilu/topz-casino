// app/api/casino/lotto/history/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const draws = await prisma.lottoDraw.findMany({
    where: { status: "SETTLED" },
    orderBy: { drawAt: "desc" },
    take: 20,
  });
  return NextResponse.json({
    items: draws.map(d => ({
      code: d.code,
      drawAt: d.drawAt,
      numbers: d.numbers,
      special: d.special,
      pool: d.pool,
      jackpot: d.jackpot,
    }))
  });
}
