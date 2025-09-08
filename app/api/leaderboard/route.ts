// app/api/leaderboard/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const room = searchParams.get("room") as "R30" | "R60" | "R90" | null;
    const range = (searchParams.get("range") || "week").toLowerCase(); // week | day | all

    // 時間範圍
    const now = new Date();
    let since: Date | undefined;
    if (range === "week") {
      since = new Date(now);
      since.setDate(since.getDate() - 7);
    } else if (range === "day") {
      since = new Date(now);
      since.setDate(since.getDate() - 1);
    }

    // 聚合：以投注淨贏(派彩-下注) 或單純投注額，這裡示範以「派彩總額」排序
    // 依你的資料表：ledger.type = 'PAYOUT' 作為派彩入帳
    const whereLedger: any = {
      type: "PAYOUT",
      ...(since ? { createdAt: { gte: since } } : {}),
    };

    // 若要限定房間，可從 round 反查，這裡示例用 bet -> round.room 做條件
    // 但 ledger 沒 roundId，若你要精準到房間，建議改以 bet 聚合：
    // 下方提供 bet 聚合版本（依「本房間投注總額」排序），比較直觀。

    if (room) {
      const top = await prisma.bet.groupBy({
        by: ["userId"],
        where: {
          ...(since ? { createdAt: { gte: since } } : {}),
          round: { room },
        },
        _sum: { amount: true },
        orderBy: { _sum: { amount: "desc" } },
        take: 20,
      });

      // 取暱稱
      const userIds = top.map((t) => t.userId);
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, nickname: true },
      });
      const nameMap = Object.fromEntries(users.map((u) => [u.id, u.nickname || u.id.slice(0, 6)]));

      const items = top.map((t, i) => ({
        rank: i + 1,
        nickname: nameMap[t.userId] ?? t.userId.slice(0, 6),
        amount: t._sum.amount ?? 0,
      }));

      return NextResponse.json({ ok: true, items });
    }

    // 全站週榜（以派彩金額排序）
    const payout = await prisma.ledger.groupBy({
      by: ["userId"],
      where: whereLedger,
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 20,
    });

    const userIds = payout.map((t) => t.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, nickname: true },
    });
    const nameMap = Object.fromEntries(users.map((u) => [u.id, u.nickname || u.id.slice(0, 6)]));

    const items = payout.map((t, i) => ({
      rank: i + 1,
      nickname: nameMap[t.userId] ?? t.userId.slice(0, 6),
      amount: Math.max(0, t._sum.amount ?? 0),
    }));

    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "INTERNAL_ERROR" }, { status: 500 });
  }
}
