import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import type { RoomCode } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await getUserFromRequest(req);
    if (!auth) {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const room = searchParams.get("room") as RoomCode | null;
    const take = Math.min(Math.max(parseInt(searchParams.get("take") ?? "10", 10), 1), 50);

    if (!room) {
      return NextResponse.json({ ok: false, error: "ROOM_REQUIRED" }, { status: 400 });
    }

    // 直接用 relation 篩選：round.room = room
    const items = await prisma.bet.findMany({
      where: { userId: auth.id, round: { room } },
      orderBy: { createdAt: "desc" },
      take,
      include: {
        round: {
          select: { id: true, seq: true, room: true, outcome: true, resultJson: true },
        },
      },
    });

    // 前端範例會讀 bets / payouts；這裡回傳你下的注與對應回合資訊
    // 如果要同時帶派彩紀錄，可另外查 ledger type=PAYOUT, roundId=...（這裡先保留簡單版）
    const transformed = items.map((b) => ({
      id: b.id,
      amount: b.amount,
      side: b.side,
      createdAt: b.createdAt.toISOString(),
      roundId: b.roundId,
      seq: b.round?.seq ?? null,
      outcome: b.round?.outcome ?? null,
      result: b.round?.resultJson ? JSON.parse(b.round.resultJson) : null,
    }));

    return NextResponse.json({ ok: true, items: transformed });
  } catch (e: any) {
    console.error("history error:", e);
    return NextResponse.json(
      { ok: false, error: e?.message ?? "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
