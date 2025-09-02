// app/(player-suite)/api/leaderboard/route.ts
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyRequest } from "@/lib/jwt"; // 你的現有方法
import { rebuildSnapshot } from "@/lib/stats";
import { currentWindow } from "@/lib/time-window";

// GET /api/leaderboard?period=daily|weekly&limit=50&withBonus=false&room=R30|R60|R90|ALL
export async function GET(req: Request) {
  const url = new URL(req.url);
  const period = (url.searchParams.get("period") ?? "daily").toUpperCase() as "DAILY"|"WEEKLY";
  const limit  = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10) || 50, 200);
  const withBonus = (url.searchParams.get("withBonus") ?? "false") === "true";

  let roomParam = url.searchParams.get("room") ?? "ALL";
  roomParam = roomParam.toUpperCase();
  const room = roomParam === "ALL" ? undefined : (["R30","R60","R90"].includes(roomParam) ? roomParam as "R30"|"R60"|"R90" : undefined);

  const auth = verifyRequest(req);
  if (!auth?.sub) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  // 確保快照存在（lazy rebuild）
  await rebuildSnapshot(period, room);
  const { windowStart, windowEnd } = currentWindow(period);

  const where: any = { period, windowStart, windowEnd, room: room ?? null };

  // 排序欄位：純遊戲損益或含獎勵
  const orderBy = withBonus
    ? { // (gamePayout + bonusIncome - gameBet)
        // Prisma 不支援直接相加排序；改成取出後在程式排序（limit 會在程式側做）
      }
    : { netProfit: "desc" as const };

  // 先取一批（多抓一點以便 withBonus 時本地排序）
  const snapshots = await prisma.userStatSnapshot.findMany({
    where,
    orderBy: orderBy as any,
    take: withBonus ? 500 : limit,
    include: {
      user: { select: { id: true, name: true, avatarUrl: true, publicSlug: true } }
    }
  });

  let rows = snapshots.map(s => {
    const netWithBonus = (s.gamePayout + s.bonusIncome) - s.gameBet;
    return {
      userId: s.userId,
      userName: s.user?.name ?? "",
      avatarUrl: s.user?.avatarUrl ?? null,
      publicSlug: s.user?.publicSlug ?? null,
      room: s.room,
      period: s.period,
      windowStart: s.windowStart,
      windowEnd: s.windowEnd,
      stats: {
        bet: s.gameBet.toString(),
        payout: s.gamePayout.toString(),
        bonus: s.bonusIncome.toString(),
        betsCount: s.betsCount,
        wins: s.winsCount,
        losses: s.lossesCount,
        netProfit: s.netProfit.toString(),
        netWithBonus: netWithBonus.toString(),
      }
    };
  });

  if (withBonus) {
    rows.sort((a, b) => {
      const A = BigInt(a.stats.netWithBonus);
      const B = BigInt(b.stats.netWithBonus);
      return (A===B)?0:(A<B?1:-1);
    });
    rows = rows.slice(0, limit);
  }

  return NextResponse.json({
    period,
    room: room ?? "ALL",
    windowStart,
    windowEnd,
    withBonus,
    items: rows
  });
}
