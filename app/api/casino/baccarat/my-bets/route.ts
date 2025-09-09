// app/api/casino/baccarat/my-bets/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getOptionalUserId } from "@/lib/auth";
import { z } from "zod";
import type { RoomCode } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const Q = z.object({
  room: z.string().transform(s => s.toUpperCase()).pipe(z.enum(["R30","R60","R90"] as const)),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const parsed = Q.safeParse({ room: searchParams.get("room") ?? "" });
    if (!parsed.success) {
      // 也回 200，但空資料，避免前端崩潰
      return NextResponse.json({ items: [] });
    }
    const room = parsed.data.room as RoomCode;
    const userId = await getOptionalUserId(req);

    if (!userId) return NextResponse.json({ items: [] });

    const rows = await prisma.bet.groupBy({
      by: ["side"],
      where: { userId, round: { room } },
      _sum: { amount: true },
    });
    const items = rows.map(r => ({ side: r.side, amount: r._sum.amount ?? 0 }));
    return NextResponse.json({ items });
  } catch (e) {
    console.error("[my-bets] error:", e);
    // 也回 200，空
    return NextResponse.json({ items: [] });
  }
}
