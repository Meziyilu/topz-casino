export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

function noStoreJson(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0", Pragma: "no-cache", Expires: "0" },
  });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.max(1, Math.min(200, Number(url.searchParams.get("limit") ?? 30)));

  const items = await prisma.lottoRound.findMany({
    orderBy: [{ day: "desc" }, { code: "desc" }],
    take: limit,
    select: { day: true, code: true, drawAt: true, status: true, numbers: true, special: true, pool: true, jackpot: true },
  });

  return noStoreJson({ items });
}
