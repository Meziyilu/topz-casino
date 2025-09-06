// app/api/casino/baccarat/my-bets/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/authz";
import { ensureCurrentRound } from "@/services/baccarat.service";

export async function GET(req: Request) {
  try {
    const me = await getUserFromRequest(req);
    if (!me) return NextResponse.json({ ok: false, error: "UNAUTH" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const roomParam = String(searchParams.get("room") || "R60").toUpperCase() as any;

    const round = await ensureCurrentRound(roomParam);

    const items = await prisma.bet.findMany({
      where: { roundId: round.id, userId: me.id },
      select: { side: true, amount: true },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ items });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "MY_BETS_FAIL" }, { status: 400 });
  }
}
