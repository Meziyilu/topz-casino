// app/api/checkin/status/route.ts
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
      "Cache-Control": "no-store, no-cache, must-revalidate",
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
    select: { id: true, email: true, balance: true },
  });
}

function taipeiDayStart(date = new Date()) {
  const utc = date.getTime();
  const tpe = utc + 8 * 3600_000;
  const tpeStart = Math.floor(tpe / 86_400_000) * 86_400_000;
  return new Date(tpeStart - 8 * 3600_000);
}

export async function GET(req: Request) {
  try {
    const me = await getUser(req);
    if (!me) return noStoreJson({ error: "未登入" }, 401);

    const dayStart = taipeiDayStart(new Date());

    // 今天紀錄
    const today = await prisma.dailyCheckin.findUnique({
      where: { userId_day: { userId: me.id, day: dayStart } },
      select: { id: true, reward: true, streak: true, createdAt: true },
    });

    // 前一筆（用來算 streak）
    const prev = await prisma.dailyCheckin.findFirst({
      where: { userId: me.id },
      orderBy: { day: "desc" },
      select: { day: true, streak: true },
    });

    // 計算下一次獎勵
    const oneDayMs = 86_400_000;
    let nextStreak = 1;
    if (prev) {
      const prevMs = new Date(prev.day).getTime();
      const diffDays = Math.round((dayStart.getTime() - prevMs) / oneDayMs);
      nextStreak = diffDays === 1 ? (prev.streak ?? 0) + 1 : 1;
    }
    const base = 100;
    const extra = Math.max(0, (nextStreak - 1) * 10);
    const nextReward = Math.min(base + extra, 300);

    // 近 7 天
    const recent = await prisma.dailyCheckin.findMany({
      where: { userId: me.id },
      orderBy: { day: "desc" },
      take: 7,
      select: { day: true, reward: true, streak: true, createdAt: true },
    });

    return noStoreJson({
      ok: true,
      canClaim: !today,
      today: today ?? null,
      nextReward,
      recent,
      balance: me.balance,
    });
  } catch (e: any) {
    return noStoreJson({ error: e?.message || "Server error" }, 500);
  }
}
