// app/api/casino/baccarat/leaderboard/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { RoomCode, StatPeriod } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toPeriod(p?: string): StatPeriod {
  const s = (p || "WEEKLY").toUpperCase();
  if (s === "DAILY") return "DAILY";
  if (s === "ALL_TIME") return "ALL_TIME";
  return "WEEKLY";
}

function toRoomCode(r?: string): RoomCode | undefined {
  if (!r) return undefined;
  const u = r.toUpperCase();
  return (["R30", "R60", "R90"] as RoomCode[]).includes(u as RoomCode)
    ? (u as RoomCode)
    : undefined;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const period = toPeriod(searchParams.get("period") || undefined);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "10", 10), 1), 50);
    const room = toRoomCode(searchParams.get("room") || undefined);

    // 1) 找到這個期間 +（可選）房間 的最新快照視窗
    const latest = await prisma.userStatSnapshot.findFirst({
      where: {
        period,
        ...(room ? { room } : {}),
      },
      orderBy: [{ windowEnd: "desc" }, { updatedAt: "desc" }],
      select: { windowStart: true, windowEnd: true },
    });

    // 2) 沒有快照就回空榜
    if (!latest) {
      return NextResponse.json({
        ok: true,
        period,
        room: room ?? null,
        window: null,
        items: [],
      });
    }

    // 3) 在該快照視窗內取排行榜
    const rows = await prisma.userStatSnapshot.findMany({
      where: {
        period,
        windowStart: latest.windowStart,
        windowEnd: latest.windowEnd,
        ...(room ? { room } : {}),
      },
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
          },
        },
      },
    });

    const items = rows.map((r, idx) => ({
      rank: idx + 1,
      userId: r.userId,
      netProfit: Number(r.netProfit ?? 0), // BigInt -> number
      wins: r.winsCount,
      losses: r.lossesCount,
      bets: r.betsCount,
      displayName: r.user?.displayName || "玩家",
      avatarUrl: r.user?.avatarUrl || null,
      vipTier: r.user?.vipTier ?? 0,
      headframe: r.user?.headframe ?? null,
      panelTint: r.user?.panelTint ?? null,
    }));

    return NextResponse.json({
      ok: true,
      period,
      room: room ?? null,
      window: { start: latest.windowStart, end: latest.windowEnd },
      items,
    });
  } catch (e) {
    console.error("[baccarat/leaderboard] GET error:", e);
    return NextResponse.json({ ok: false, error: "INTERNAL" }, { status: 500 });
  }
}
