export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyRequest } from "@/lib/auth";

function noStoreJson(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0", Pragma: "no-cache", Expires: "0" },
  });
}

export async function GET(req: Request) {
  const auth = verifyRequest(req);
  if (!auth?.userId) return noStoreJson({ error: "UNAUTHORIZED" }, 401);

  const url = new URL(req.url);
  const limit = Math.max(1, Math.min(100, Number(url.searchParams.get("limit") ?? 50)));

  const items = await prisma.lottoBet.findMany({
    where: { userId: auth.userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true, kind: true, picks: true, picksKey: true, ballIndex: true, attr: true,
      amount: true, status: true, payout: true, matched: true, hitSpecial: true, createdAt: true,
      round: { select: { day: true, code: true, status: true, drawAt: true, numbers: true, special: true } },
    },
  });

  return noStoreJson({ items });
}
