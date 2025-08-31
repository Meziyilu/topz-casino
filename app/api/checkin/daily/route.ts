// app/api/checkin/daily/route.ts
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyJWT } from "@/lib/jwt";

// 小工具
const noStoreJson = (payload: any, status = 200) =>
  NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
    },
  });

const readTokenFromHeaders = (req: Request): string | null => {
  const raw = req.headers.get("cookie");
  if (!raw) return null;
  const m = raw.match(/(?:^|;\s*)token=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
};

async function getUser(req: Request) {
  const token = readTokenFromHeaders(req);
  if (!token) return null;
  const payload = await verifyJWT(token).catch(() => null);
  if (!payload?.sub) return null;
  return prisma.user.findUnique({
    where: { id: String(payload.sub) },
    select: { id: true, email: true, name: true, balance: true },
  });
}

// 台北當日 00:00（UTC 表示）
function taipeiDayStart(date = new Date()) {
  const utc = date.getTime();
  const tpe = utc + 8 * 3600_000;
  const tpeStart = Math.floor(tpe / 86_400_000) * 86_400_000;
  return new Date(tpeStart - 8 * 3600_000);
}
function nextTaipeiMidnight(from = new Date()) {
  const start = taipeiDayStart(from).getTime();
  const next = start + 86_400_000; // +1 day
  return new Date(next);
}

// 7 日循環獎勵（可自行調整）
const REWARDS = [100, 120, 150, 180, 220, 260, 320];

// 依據「昨天是否簽到」推算今日連續天數 & 今日獎勵
async function computeTodayReward(userId: string) {
  const today = taipeiDayStart(new Date());
  const yesterday = new Date(today.getTime() - 86_400_000);

  const y = await prisma.dailyCheckin.findUnique({
    where: { userId_day: { userId, day: yesterday } },
    select: { streak: true },
  });

  const streak = y ? y.streak + 1 : 1;
  const reward = REWARDS[(streak - 1) % REWARDS.length];

  return { today, streak, reward };
}

// GET：查今日是否簽到 + streak + 今日可領獎勵 + 下次重置時間
export async function GET(req: Request) {
  try {
    const me = await getUser(req);
    if (!me) return noStoreJson({ error: "未登入" }, 401);

    const today = taipeiDayStart(new Date());
    const row = await prisma.dailyCheckin.findUnique({
      where: { userId_day: { userId: me.id, day: today } },
      select: { streak: true, reward: true, createdAt: true },
    });

    let streak: number;
    let reward: number;

    if (row) {
      // 已簽到
      streak = row.streak;
      reward = row.reward;
    } else {
      // 未簽到，給出今日「可領」的獎勵與預計 streak
      const c = await computeTodayReward(me.id);
      streak = c.streak;
      reward = c.reward;
    }

    return noStoreJson({
      claimed: !!row,
      streak,
      reward,
      nextResetAt: nextTaipeiMidnight(new Date()),
      balance: me.balance,
    });
  } catch (e: any) {
    return noStoreJson({ error: e?.message || "Server error" }, 500);
  }
}

// POST：簽到領獎勵（寫 DailyCheckin、加錢包、寫 Ledger）
export async function POST(req: Request) {
  try {
    const me = await getUser(req);
    if (!me) return noStoreJson({ error: "未登入" }, 401);

    const { today, streak, reward } = await computeTodayReward(me.id);

    // 已簽到防重複
    const exist = await prisma.dailyCheckin.findUnique({
      where: { userId_day: { userId: me.id, day: today } },
      select: { id: true },
    });
    if (exist) return noStoreJson({ error: "今日已簽到" }, 409);

    // 交易：寫 checkin、加錢、寫 ledger
    const result = await prisma.$transaction(async (tx) => {
      await tx.dailyCheckin.create({
        data: { userId: me.id, day: today, reward, streak },
      });

      const after = await tx.user.update({
        where: { id: me.id },
        data: { balance: { increment: reward } },
        select: { balance: true, bankBalance: true },
      });

      await tx.ledger.create({
        data: {
          userId: me.id,
          type: "ADMIN_ADJUST", // 不新增 enum，沿用現有
          target: "WALLET",
          delta: reward,
          memo: `每日簽到 第 ${streak} 天 +${reward}`,
          balanceAfter: after.balance,
          bankAfter: after.bankBalance,
        },
      });

      return after.balance;
    });

    return noStoreJson({
      ok: true,
      claimed: true,
      reward,
      streak,
      balance: result,
      nextResetAt: nextTaipeiMidnight(new Date()),
      message: `簽到成功！第 ${streak} 天 +${reward}`,
    });
  } catch (e: any) {
    return noStoreJson({ error: e?.message || "Server error" }, 500);
  }
}
