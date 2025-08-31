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
      "Cache-Control":
        "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
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
    select: { id: true, email: true, balance: true, bankBalance: true },
  });
}

// 台北當日 00:00（UTC 表示）
function taipeiDayStart(date = new Date()) {
  const utc = date.getTime();
  const tpe = utc + 8 * 3600_000;
  const tpeStart = Math.floor(tpe / 86_400_000) * 86_400_000;
  return new Date(tpeStart - 8 * 3600_000);
}

export async function POST(req: Request) {
  try {
    const me = await getUser(req);
    if (!me) return noStoreJson({ error: "未登入" }, 401);

    const dayStart = taipeiDayStart(new Date());

    // 今天是否已簽到
    const today = await prisma.dailyCheckin.findUnique({
      where: { userId_day: { userId: me.id, day: dayStart } },
      select: { id: true, streak: true, reward: true, createdAt: true },
    });
    if (today) {
      return noStoreJson(
        {
          ok: false,
          message: "今天已領取過",
          checkin: today,
          balance: me.balance,
        },
        200
      );
    }

    // 取上一筆簽到，判斷連續天數
    const prev = await prisma.dailyCheckin.findFirst({
      where: { userId: me.id },
      orderBy: { day: "desc" },
      select: { day: true, streak: true },
    });

    // 是否「昨天」有簽到（粗略用毫秒差一天判定）
    const oneDayMs = 86_400_000;
    let streak = 1;
    if (prev) {
      const prevDayMs = new Date(prev.day).getTime();
      const diffDays = Math.round((dayStart.getTime() - prevDayMs) / oneDayMs);
      streak = diffDays === 1 ? (prev.streak ?? 0) + 1 : 1;
    }

    // 設計：固定 100 + 連續獎勵 10 * (streak-1)，封頂 300
    const base = 100;
    const extra = Math.max(0, (streak - 1) * 10);
    const reward = Math.min(base + extra, 300);

    // 交易：寫入 DailyCheckin + 加款到錢包 + Ledger
    const result = await prisma.$transaction(async (tx) => {
      const created = await tx.dailyCheckin.create({
        data: {
          userId: me.id,
          day: dayStart,
          reward,
          streak,
        },
        select: { id: true, day: true, reward: true, streak: true, createdAt: true },
      });

      const after = await tx.user.update({
        where: { id: me.id },
        data: { balance: { increment: reward } },
        select: { balance: true, bankBalance: true },
      });

      await tx.ledger.create({
        data: {
          userId: me.id,
          type: asAny("ADMIN_ADJUST"), // 或用 PAYOUT 也可
          target: asAny("WALLET"),
          delta: reward,
          memo: `每日簽到 +${reward}（連續 ${streak} 天）`,
          balanceAfter: after.balance,
          bankAfter: after.bankBalance,
        },
      });

      return { created, balance: after.balance };
    });

    return noStoreJson(
      {
        ok: true,
        checkin: result.created,
        balance: result.balance,
        reward,
        streak,
      },
      200
    );
  } catch (e: any) {
    return noStoreJson({ error: e?.message || "Server error" }, 500);
  }
}
