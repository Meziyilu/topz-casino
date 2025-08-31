// app/api/checkin/status/route.ts
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyJWT } from "@/lib/jwt";

/** ---- 小工具（檔案私有，避免被當成 Route export） ---- */
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
    select: { id: true, email: true, name: true, balance: true, bankBalance: true },
  });
}

/** 台北當日 00:00（以 UTC 儲存） */
function taipeiDayStart(date = new Date()) {
  const utc = date.getTime();
  const tpe = utc + 8 * 3600_000;
  const tpeStart = Math.floor(tpe / 86_400_000) * 86_400_000;
  return new Date(tpeStart - 8 * 3600_000);
}

/** 前一日（台北日） */
function tpePrevDay(d: Date) {
  return new Date(d.getTime() - 86_400_000);
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
  const hasDay = new Set(rows.map(r => new Date(r.day).getTime()));
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
    const me = await getUser(req);
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
  } catch (e: any) {
    return noStoreJson({ error: e?.message || "Server error" }, 500);
  }
}
