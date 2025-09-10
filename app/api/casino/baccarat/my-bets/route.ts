import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOptionalUserId } from "@/lib/auth";
import { z } from "zod";
import type { RoomCode, BetSide } from "@prisma/client";

export const dynamic = "force-dynamic";

const Q = z.object({
  room: z.string().transform(s => s.toUpperCase()).pipe(z.enum(["R30","R60","R90"] as const)),
  roundId: z.string().nullish(), // 可帶；沒有就抓最新一局
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const parsed = Q.safeParse({
      room: searchParams.get("room") ?? "",
      roundId: searchParams.get("roundId"),
    });
    if (!parsed.success) {
      return NextResponse.json({ items: [] });
    }

    const room = parsed.data.room as RoomCode;
    const userId = await getOptionalUserId(req);
    if (!userId) return NextResponse.json({ items: [] });

    // 找本局 roundId（若沒帶就找該房最新一局）
    let roundId = parsed.data.roundId || null;
    if (!roundId) {
      const cur = await prisma.round.findFirst({
        where: { room },
        orderBy: { startedAt: "desc" },
        select: { id: true },
      });
      roundId = cur?.id ?? null;
    }
    if (!roundId) return NextResponse.json({ items: [] });

    const rows = await prisma.bet.groupBy({
      by: ["side"],
      where: { userId, roundId },
      _sum: { amount: true },
    });

    const items = rows.map(r => ({
      side: r.side as BetSide,
      amount: Number(r._sum.amount || 0),
    }));

    return NextResponse.json({ items });
  } catch (e: any) {
    console.error("[my-bets] error:", e);
    return NextResponse.json({ items: [] });
  }
}
