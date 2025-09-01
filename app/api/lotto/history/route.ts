// app/api/lotto/history/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const noStore = (payload: any, status = 200) =>
  NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
    },
  });

// /api/lotto/history?cursor=ROUND_CODE&limit=20
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "20", 10), 1), 100);
  const cursor = searchParams.get("cursor");

  const where = cursor ? { code: { lt: Number(cursor) } } : {};
  const rows = await prisma.lottoRound.findMany({
    where,
    orderBy: [{ code: "desc" }],
    take: limit + 1,
    select: {
      code: true, drawAt: true, numbers: true, special: true, jackpot: true, pool: true, status: true,
    },
  });

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? String(items[items.length - 1].code) : null;

  return noStore({ ok: true, items, nextCursor, limit });
}
