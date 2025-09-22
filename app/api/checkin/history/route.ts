export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function getUserIdFromCookie(req: Request): Promise<string | null> {
  const cookie = req.headers.get("cookie") || "";
  const m = /uid=([^;]+)/.exec(cookie);
  return m?.[1] || null;
}

export async function GET(req: Request) {
  const userId = await getUserIdFromCookie(req);
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = Math.max(1, Math.min(100, Number(searchParams.get("limit") || 14)));

  const list = await prisma.dailyCheckinClaim.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json({ list });
}
