// app/api/checkin/status/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyRequest } from "@/lib/jwt";

function noStoreJson<T>(payload: T, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

/** 台北當日 00:00（以 UTC 儲存） */
function taipeiDayStart(date = new Date()) {
  const utc = date.getTime();
  const tpe = utc + 8 * 3600_000;
  const tpeStart = Math.floor(tpe / 86_400_000) * 86_400_000;
  return new Date(tpeStart - 8 * 3600_000);
}

/** 依照 streak 算今日獎勵（你可自由調整規則） */
function rewardForStreak(streak: number) {
  // 1~6天 100，滿7天 300；之後循環
  const mod = ((streak + 1) % 7) || 7; // 查詢「下一次簽到的第幾天」
  if (mod === 7) return 300;
  return 100;
}

/** 計算連續簽到天數（向前回推） */
async function calcStreak(userId: string, todayTpe: Date) {
  // 抓最近 14 筆簽到
  const rows = await prisma.dailyCheckin.findMany({
    where: { userId },
    orderBy: { day: "desc" },
    take: 14,
    select: { day: true },
  });

  // 把 day 轉成 time 值便於比對
  const hasDay = new Set(rows.map((r) => new Date(r.day).getTime()));
  let streak = 0;
  let cursor = todayTpe.getTime();

  // 連續往回（今天是否簽到不影響 streak 的「下一次簽到」獎勵計算）
  while (hasDay.has(cursor)) {
    streak += 1;
    cursor -= 86_400_000;
  }
  return streak;
}

/** ---- Handler ---- */
export async function GET(req: Request) {
  try {
    const auth = await verifyRequest(req);
    const userId =
      (auth as { userId?: string; sub?: string } | null)?.userId ??
      (auth as { sub?: string } | null)?.sub;
    if (!userId) return noStoreJson({ error: "未登入" }, 401);

    const me = await prisma.user.findUnique({
      where: { id: String(userId) },
      select: { id: true, email: true, name: true, balance: true, bankBalance: true },
    });
    if (!me) return noStoreJson({ error: "未登入" }, 401);

    const today = taipeiDayStart(new Date());

    // 今天是否簽到
    const todayRow = await prisma.dailyCheckin.findUnique({
      where: { userId_day: { userId: me.id, day: today } },
      select: { reward: true, streak: true },
    });

    // streak 計算（以資料庫連續天數為準，向前回推）
    const streak = await calcStreak(me.id, today);

    // 今日應得獎勵（若未簽到）
    const todayReward = todayRow ? todayRow.reward : rewardForStreak(streak);

    return noStoreJson({
      ok: true,
      today: {
        claimed: !!todayRow,
        reward: todayReward,
        day: today.toISOString(),
      },
      streak,
      balance: me.balance,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    return noStoreJson({ error: message }, 500);
  }
}
