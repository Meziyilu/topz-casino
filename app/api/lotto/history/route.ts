// app/api/lotto/history/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

function noStore<T>(payload: T, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

// /api/lotto/history?cursor=ROUND_CODE&limit=20
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  // limit: 1~100，預設 20
  const limitParam = searchParams.get("limit");
  const limitRaw = Number.parseInt(limitParam ?? "20", 10);
  const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 20, 1), 100);

  // cursor: 若非數字則忽略
  const cursorParam = searchParams.get("cursor");
  const cursorNum = cursorParam != null ? Number(cursorParam) : null;
  const cursor =
    cursorNum != null && Number.isFinite(cursorNum) ? cursorNum : null;

  const where = cursor != null ? { code: { lt: cursor } } : {};

  const rows = await prisma.lottoRound.findMany({
    where,
    orderBy: [{ code: "desc" }],
    take: limit + 1,
    select: {
      code: true,
      drawAt: true,
      numbers: true,
      special: true,
      jackpot: true,
      pool: true,
      status: true,
    },
  });

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? String(items[items.length - 1].code) : null;

  return noStore({ ok: true, items, nextCursor, limit });
}
