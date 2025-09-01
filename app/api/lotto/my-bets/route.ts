// app/api/lotto/my-bets/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyRequest } from "@/lib/jwt";

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

// /api/lotto/my-bets?limit=50&cursor=BET_ID
export async function GET(req: Request) {
  const auth = await verifyRequest(req);
  const userId =
    (auth as { userId?: string; sub?: string } | null)?.userId ??
    (auth as { sub?: string } | null)?.sub;
  if (!userId) return noStore({ error: "UNAUTHORIZED" }, 401);

  const { searchParams } = new URL(req.url);

  // limit：1~200，預設 50
  const limitParam = searchParams.get("limit");
  const limitRaw = Number.parseInt(limitParam ?? "50", 10);
  const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 50, 1), 200);

  // cursor：bet id（字串）；空字串或 null 視為未提供
  const cursorParam = searchParams.get("cursor");
  const cursor = cursorParam && cursorParam.trim().length > 0 ? cursorParam : null;

  const take = limit + 1;

  const rows = await prisma.lottoBet.findMany({
    where: { userId: String(userId) },
    orderBy: [{ createdAt: "desc" }],
    take,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      createdAt: true,
      kind: true,
      amount: true,
      picks: true,
      ballIndex: true,
      attr: true,
      status: true,
      payout: true,
      matched: true,
      hitSpecial: true,
      round: {
        select: {
          id: true,
          code: true,
          drawAt: true,
          status: true,
          numbers: true,
          special: true,
        },
      },
    },
  });

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  return noStore({ ok: true, items, nextCursor, limit });
}
