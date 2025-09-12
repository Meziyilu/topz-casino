// app/api/admin/lotto/bets/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const drawId = url.searchParams.get("drawId");
  if (!drawId) return NextResponse.json({ error: "MISSING_DRAW_ID" }, { status: 400 });

  const items = await prisma.lottoBet.findMany({
    where: { drawId },
    orderBy: { createdAt: "desc" },
    include: { user: { select: { id: true, displayName: true, balance: true } } },
  });

  return NextResponse.json({
    items: items.map(b => ({
      id: b.id,
      userId: b.userId,
      userName: b.user?.displayName ?? "",
      userBalance: b.user?.balance ?? 0,
      picks: b.picks,
      amount: b.amount,
      createdAt: b.createdAt,
    })),
  });
}
