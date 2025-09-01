// app/api/lotto/my-bets/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyRequest } from "@/lib/jwt";

const noStore = (payload: any, status = 200) =>
  NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
    },
  });

// /api/lotto/my-bets?limit=50&cursor=BET_ID
export async function GET(req: Request) {
  const auth = verifyRequest(req);
  if (!auth?.userId) return noStore({ error: "UNAUTHORIZED" }, 401);

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "50", 10), 1), 200);
  const cursor = searchParams.get("cursor");

  const take = limit + 1;
  const rows = await prisma.lottoBet.findMany({
    where: { userId: auth.userId },
    orderBy: [{ createdAt: "desc" }],
    take,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true, createdAt: true, kind: true, amount: true, picks: true, ballIndex: true, attr: true,
      status: true, payout: true, matched: true, hitSpecial: true,
      round: { select: { id: true, code: true, drawAt: true, status: true, numbers: true, special: true } },
    },
  });

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  return noStore({ ok: true, items, nextCursor, limit });
}
