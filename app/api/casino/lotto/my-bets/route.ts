// app/api/casino/lotto/my-bets/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "MISSING_USER" }, { status: 400 });

  const bets = await prisma.lottoBet.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { draw: true },
  });

  return NextResponse.json({ items: bets.map(b => ({
    id: b.id,
    drawCode: b.draw.code,
    picks: b.picks,
    amount: b.amount,
    status: b.draw.status,
    winNumbers: b.draw.numbers,
    special: b.draw.special,
    drawAt: b.draw.drawAt,
  })) });
}
