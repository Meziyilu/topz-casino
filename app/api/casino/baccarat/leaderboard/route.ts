import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { RoomCode, LedgerTarget } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const room = (searchParams.get("room") || "") as RoomCode;
    if (!["R30","R60","R90"].includes(room)) {
      return NextResponse.json({ error: "ROOM_REQUIRED" }, { status: 400 });
    }

    // 近 7 天
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // 用 ledger 合計（BET_PLACED 為負，PAYOUT 為正）=> 直接總和就是淨額
    const byUser = await prisma.ledger.groupBy({
      by: ["userId"],
      where: {
        createdAt: { gte: since },
        target: "WALLET" as LedgerTarget,
        // 若你的 ledger 沒有 room 欄位，就拿近 7 天全站；要分房間可改寫入 room 到 ledger
      },
      _sum: { amount: true },
    });

    // 取前 50 再排序/取前 10（避免 groupBy 直接排序沒有取 nickname）
    const top50 = byUser
      .map((r) => ({ userId: r.userId, net: Number(r._sum.amount || 0) }))
      .sort((a, b) => b.net - a.net)
      .slice(0, 10);

    const ids = top50.map((r) => r.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, nickname: true },
    });
    const nameMap = new Map(users.map(u => [u.id, u.nickname || ""]));

    // 乾淨化暱稱（避免奇怪字元/超長）
    const clean = (s?: string | null) => {
      const raw = (s ?? "").toString();
      const trimmed = raw.replace(/[\u0000-\u001f]+/g, "").trim();
      return (trimmed || "玩家").slice(0, 16);
    };

    const items = top50.map((r, i) => ({
      rank: i + 1,
      name: clean(nameMap.get(r.userId)),
      score: r.net,
    }));

    return NextResponse.json({ items });
  } catch (e: any) {
    console.error("[leaderboard] error:", e);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
