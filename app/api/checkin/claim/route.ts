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
    headers: { "Cache-Control": "no-store" },
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
    select: { id: true, email: true, balance: true },
  });
}

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

    // 確認今天是否已領
    const today = await prisma.dailyCheckin.findUnique({
      where: { userId_day: { userId: me.id, day: dayStart } },
    });
    if (today) return noStoreJson({ error: "今天已經簽到過了" }, 400);

    // 找上一筆
    const prev = await prisma.dailyCheckin.findFirst({
      where: { userId: me.id },
      orderBy: { day: "desc" },
      select: { day: true, streak: true },
    });

    // 計算 streak
    const oneDayMs = 86_400_000;
    let streak = 1;
    if (prev) {
      const diff = Math.round((dayStart.getTime() - new Date(prev.day).getTime()) / oneDayMs);
      streak = diff === 1 ? (prev.streak ?? 0) + 1 : 1;
    }

    // 計算獎勵：基礎 100 + 連續 10，每日上限 300
    const base = 100;
    const extra = Math.max(0, (streak - 1) * 10);
    const reward = Math.min(base + extra, 300);

    // 寫入交易
    const result = await prisma.$transaction(async (tx) => {
      const checkin = await tx.dailyCheckin.create({
        data: { userId: me.id, day: dayStart, reward, streak },
      });

      const after = await tx.user.update({
        where: { id: me.id },
        data: { balance: { increment: reward } },
        select: { balance: true, bankBalance: true },
      });

      await tx.ledger.create({
        data: {
          userId: me.id,
          type: asAny("PAYOUT"),
          target: asAny("WALLET"),
          delta: reward,
          memo: `每日簽到 +${reward}`,
          balanceAfter: after.balance,
          bankAfter: after.bankBalance,
        },
      });

      return { checkin, balance: after.balance };
    });

    return noStoreJson({ ok: true, reward, streak, balance: result.balance });
  } catch (e: any) {
    return noStoreJson({ error: e?.message || "Server error" }, 500);
  }
}
