// app/api/casino/lotto/history/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const take = Math.min(parseInt(url.searchParams.get("take") || "20", 10), 100);
  const includeDrawn = url.searchParams.get("includeDrawn") === "1";

  const where = includeDrawn ? { status: { in: ["DRAWN", "SETTLED"] } } : { status: "SETTLED" as const };

  const draws = await prisma.lottoDraw.findMany({
    where,
    orderBy: { drawAt: "desc" },
    take,
  });

  return NextResponse.json({
    items: draws.map(d => ({
      code: d.code,
      drawAt: d.drawAt,
      numbers: d.numbers,
      special: d.special,
      pool: d.pool,
      jackpot: d.jackpot,
      status: d.status,
    }))
  });
}
