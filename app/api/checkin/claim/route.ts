// app/api/checkin/claim/route.ts
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyJWT } from "@/lib/jwt";

const asAny = <T = any>(v: unknown) => v as T;

function noStoreJson(payload: any, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

function readTokenFromHeaders(req: Request): string | null {
  const raw = req.headers.get("cookie");
  if (!raw) return null;
  const m = raw.match(/(?:^|;\s*)token=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

async function getUser(req: Request) {
  const token = readTokenFromHeaders(req);
  if (!token) return null;
  const payload = await verifyJWT(token).catch(() => null);
  if (!payload?.sub) return null;
  return prisma.user.findUnique({
    where: { id: String(payload.sub) },
    select: { id: true, balance: true, bankBalance: true },
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
  const hasDay = new Set(rows.map(r => new Date(r.day).getTime()));
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
    const me = await getUser(req);
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
          type: asAny("PAYOUT"),
          target: asAny("WALLET"),
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
  } catch (e: any) {
    return noStoreJson({ error: e?.message || "Server error" }, 500);
  }
}
