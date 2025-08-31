// app/api/checkin/claim/route.ts
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyJWT } from "@/lib/jwt";

const REWARDS = [100, 120, 150, 180, 220, 260, 320];

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

// 同 status/route 用
export function taipeiDayStart(date = new Date()) {
  const utcMs = date.getTime();
  const tpeMs = utcMs + 8 * 3600_000;
  const tpeDayStartMs = Math.floor(tpeMs / 86_400_000) * 86_400_000;
  return new Date(tpeDayStartMs - 8 * 3600_000);
}

async function getUser(req: Request) {
  const token = readTokenFromHeaders(req);
  if (!token) return null;
  const payload = await verifyJWT(token).catch(() => null);
  if (!payload?.sub) return null;
  return prisma.user.findUnique({
    where: { id: String(payload.sub) },
    select: { id: true, balance: true },
  });
}

export async function POST(req: Request) {
  const me = await getUser(req);
  if (!me) return noStoreJson({ error: "未登入" }, 401);

  const today = taipeiDayStart(new Date());
  const yesterday = taipeiDayStart(new Date(Date.now() - 86_400_000));

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 今天是否已簽
      const exists = await tx.dailyCheckin.findUnique({
        where: { userId_day: { userId: me.id, day: today } },
        select: { id: true, streak: true, reward: true },
      });
      if (exists) {
        return { claimed: true, reward: exists.reward, streak: exists.streak, balance: me.balance };
      }

      // 找前一天簽到，計算 streak
      const last = await tx.dailyCheckin.findFirst({
        where: { userId: me.id },
        orderBy: { day: "desc" },
        select: { day: true, streak: true },
      });

      let nextStreak = 1;
      if (last?.day && last.day.getTime() === yesterday.getTime()) {
        nextStreak = (last.streak ?? 0) + 1;
      }
      if (nextStreak > 7) nextStreak = 1;

      const reward = REWARDS[nextStreak - 1];

      // 寫 DailyCheckin
      const created = await tx.dailyCheckin.create({
        data: {
          userId: me.id,
          day: today,
          reward,
          streak: nextStreak,
        },
      });

      // 入金到錢包 + Ledger
      const after = await tx.user.update({
        where: { id: me.id },
        data: { balance: { increment: reward } },
        select: { balance: true, bankBalance: true },
      });

      await tx.ledger.create({
        data: {
          userId: me.id,
          type: asAny("PAYOUT"),          // ✅ 依你 schema
          target: asAny("WALLET"),        // ✅ 依你 schema
          delta: reward,                  // 正值
          memo: `每日簽到 +${reward}`,
          balanceAfter: after.balance,
          bankAfter: after.bankBalance,
        },
      });

      return {
        claimed: true,
        reward,
        streak: nextStreak,
        balance: after.balance,
      };
    });

    return noStoreJson(result);
  } catch (e: any) {
    // 可能撞到 unique (userId, day)
    return noStoreJson({ error: e?.message || "簽到失敗" }, 400);
  }
}
