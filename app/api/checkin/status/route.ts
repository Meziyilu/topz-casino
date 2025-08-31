// app/api/checkin/status/route.ts
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyJWT } from "@/lib/jwt";

const REWARDS = [100, 120, 150, 180, 220, 260, 320]; // 1~7 天循環

const asAny = <T = any>(v: unknown) => v as T;

// 以「台北當日 00:00」為日界（UTC 儲存）
export function taipeiDayStart(date = new Date()) {
  const utcMs = date.getTime();
  const tpeMs = utcMs + 8 * 3600_000;
  const tpeDayStartMs = Math.floor(tpeMs / 86_400_000) * 86_400_000;
  return new Date(tpeDayStartMs - 8 * 3600_000);
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
    select: { id: true, email: true, name: true, balance: true },
  });
}

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

export async function GET(req: Request) {
  const me = await getUser(req);
  if (!me) return noStoreJson({ error: "未登入" }, 401);

  const today = taipeiDayStart(new Date());
  const yesterday = taipeiDayStart(new Date(Date.now() - 86_400_000));

  // 取最近一次簽到（依 day desc）
  const last = await prisma.dailyCheckin.findFirst({
    where: { userId: me.id },
    orderBy: { day: "desc" },
    select: { day: true, streak: true, reward: true, createdAt: true },
  });

  // 今天是否已簽
  const todayRow = await prisma.dailyCheckin.findUnique({
    where: {
      userId_day: {
        userId: me.id,
        day: today,
      },
    },
    select: { reward: true, streak: true, createdAt: true },
  });

  let nextStreak = 1;
  if (last?.day && last.day.getTime() === yesterday.getTime()) {
    nextStreak = (last.streak ?? 0) + 1;
  } else if (todayRow?.streak) {
    nextStreak = todayRow.streak; // 如果今天已簽
  } else {
    nextStreak = 1;
  }
  if (nextStreak > 7) nextStreak = 1; // 7 天循環

  const todayReward = REWARDS[nextStreak - 1];

  // 近 7 天紀錄（含今天）
  const recent = await prisma.dailyCheckin.findMany({
    where: { userId: me.id },
    orderBy: { day: "desc" },
    take: 7,
    select: { day: true, reward: true, streak: true, createdAt: true },
  });

  return noStoreJson({
    user: { id: me.id, name: me.name, email: me.email, balance: me.balance },
    today: today.toISOString(),
    claimedToday: !!todayRow,
    nextStreak,
    todayReward,
    recent, // 用於顯示近幾天签到
  });
}
