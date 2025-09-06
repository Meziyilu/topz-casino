// app/api/leaderboard/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { StatPeriod } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const periodParam = (searchParams.get("period") || "WEEKLY").toUpperCase();
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "10"), 1), 50);

    const period: StatPeriod =
      periodParam === "DAILY" ? "DAILY" :
      periodParam === "ALL_TIME" ? "ALL_TIME" :
      "WEEKLY";

    // 找出該期間最新的一個窗口（盡量用 windowEnd，其次 updatedAt）
    const latest = await prisma.userStatSnapshot.findFirst({
      where: { period },
      orderBy: [{ windowEnd: "desc" }, { updatedAt: "desc" }],
      select: { windowStart: true, windowEnd: true }
    });

    const where = latest
      ? { period, windowStart: latest.windowStart, windowEnd: latest.windowEnd }
      : { period };

    // 以 netProfit 由大到小（贏最多）排列
    const rows = await prisma.userStatSnapshot.findMany({
      where,
      orderBy: [{ netProfit: "desc" }],
      take: limit,
      select: {
        userId: true,
        netProfit: true,
        winsCount: true,
        lossesCount: true,
        betsCount: true,
        user: {
          select: {
            displayName: true,
            avatarUrl: true,
            vipTier: true,
            headframe: true,
            panelTint: true,
          }
        }
      }
    });

    const items = rows.map((r, idx) => ({
      rank: idx + 1,
      userId: r.userId,
      netProfit: Number(r.netProfit), // BigInt -> number（若超大可改字串）
      wins: r.winsCount,
      losses: r.lossesCount,
      bets: r.betsCount,
      displayName: r.user?.displayName || "玩家",
      avatarUrl: r.user?.avatarUrl || null,
      vipTier: r.user?.vipTier || 0,
      headframe: r.user?.headframe || null,
      panelTint: r.user?.panelTint || null,
    }));

    return NextResponse.json({
      ok: true,
      period,
      window: latest ? { start: latest.windowStart, end: latest.windowEnd } : null,
      items
    });
  } catch (e) {
    console.error("LEADERBOARD_GET", e);
    return NextResponse.json({ ok: false, error: "INTERNAL" }, { status: 500 });
  }
}
