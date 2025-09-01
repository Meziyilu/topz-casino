// app/api/checkin/claim/route.ts
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

function taipeiDayStart(date = new Date()) {
  const utc = date.getTime();
  const tpe = utc + 8 * 3600_000;
  const tpeStart = Math.floor(tpe / 86_400_000) * 86_400_000;
  return new Date(tpeStart - 8 * 3600_000);
}

function rewardForStreak(streak: number) {
  const mod = ((streak + 1) % 7) || 7;
  if (mod === 7) return 300;
  return 100;
}

async function calcStreak(userId: string, todayTpe: Date) {
  const rows = await prisma.dailyCheckin.findMany({
    where: { userId },
    orderBy: { day: "desc" },
    take: 14,
    select: { day: true },
  });
  const hasDay = new Set(rows.map((r) => new Date(r.day).getTime()));
  let streak = 0;
  let cursor = todayTpe.getTime();
  while (hasDay.has(cursor)) {
    streak += 1;
    cursor -= 86_400_000;
  }
  return streak;
}

export async function POST(req: Request) {
  try {
    const auth = await verifyRequest(req);
    const userId =
      (auth as { userId?: string; sub?: string } | null)?.userId ??
      (auth as { sub?: string } | null)?.sub;
    if (!userId) return noStoreJson({ error: "未登入" }, 401);

    const me = await prisma.user.findUnique({
      where: { id: String(userId) },
      select: { id: true, balance: true, bankBalance: true },
    });
    if (!me) return noStoreJson({ error: "未登入" }, 401);

    const today = taipeiDayStart(new Date());

    // 今天已簽到就直接回傳
    const exists = await prisma.dailyCheckin.findUnique({
      where: { userId_day: { userId: me.id, day: today } },
      select: { reward: true, streak: true },
    });
    if (exists) {
      return noStoreJson({
        ok: true,
        already: true,
        reward: exists.reward,
        streak: exists.streak,
        balance: me.balance,
      });
    }

    // 計算 streak 與今日應發獎勵
    const streakBefore = await calcStreak(me.id, today);
    const todayReward = rewardForStreak(streakBefore);
    const newStreak = streakBefore + 1;

    // 交易：寫 DailyCheckin、加錢、寫 Ledger
    const result = await prisma.$transaction(async (tx) => {
      const created = await tx.dailyCheckin.create({
        data: {
          userId: me.id,
          day: today,
          reward: todayReward,
          streak: newStreak,
        },
        select: { id: true, reward: true, streak: true },
      });

      const after = await tx.user.update({
        where: { id: me.id },
        data: { balance: { increment: todayReward } },
        select: { balance: true, bankBalance: true },
      });

      await tx.ledger.create({
        data: {
          userId: me.id,
          type: "PAYOUT",
          target: "WALLET",
          delta: todayReward,
          memo: `每日簽到 +${todayReward}`,
          balanceAfter: after.balance,
          bankAfter: after.bankBalance,
        },
      });

      return { created, balance: after.balance };
    });

    return noStoreJson({
      ok: true,
      already: false,
      reward: result.created.reward,
      streak: result.created.streak,
      balance: result.balance,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    return noStoreJson({ error: message }, 500);
  }
}
