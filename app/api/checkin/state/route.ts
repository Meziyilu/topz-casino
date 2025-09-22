export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** 你自己的登入驗證。如果已有共用方法，換成你的實作 */
async function getUserIdFromCookie(req: Request): Promise<string | null> {
  // 最簡版：讀 cookie "uid"
  const cookie = req.headers.get("cookie") || "";
  const m = /uid=([^;]+)/.exec(cookie);
  return m?.[1] || null;
}

function ymdDate(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function ymdKey(d = new Date()) {
  return ymdDate(d).toISOString();
}
function isSameYmd(a: Date | string, b: Date | string) {
  return ymdDate(new Date(a)).getTime() === ymdDate(new Date(b)).getTime();
}
function isYesterday(a: Date, b: Date) {
  const A = ymdDate(a).getTime(), B = ymdDate(b).getTime();
  return A - B === 24 * 60 * 60 * 1000;
}

async function loadConfig() {
  const tableCfg = await prisma.gameConfig.findUnique({
    where: { gameCode_key: { gameCode: "GLOBAL", key: "CHECKIN_TABLE" } },
  });
  const sundayCfg = await prisma.gameConfig.findUnique({
    where: { gameCode_key: { gameCode: "GLOBAL", key: "CHECKIN_SUNDAY_BONUS" } },
  });

  let table: number[] = Array(30).fill(0);
  try {
    if (tableCfg?.valueString) {
      const parsed = JSON.parse(tableCfg.valueString);
      if (Array.isArray(parsed) && parsed.length === 30) table = parsed.map((v) => Number(v || 0));
    }
  } catch {}
  const sundayBonus = Number(sundayCfg?.valueInt || sundayCfg?.valueFloat || sundayCfg?.valueBool ? 0 : sundayCfg?.valueInt) || Number(sundayCfg?.valueInt || 0);

  return { table, sundayBonus: Number(isNaN(sundayBonus) ? 0 : sundayBonus) };
}

export async function GET(req: Request) {
  const userId = await getUserIdFromCookie(req);
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const today = ymdDate();
  const todayKey = ymdKey(today);

  const state = await prisma.userCheckinState.findUnique({ where: { userId } });
  const { table, sundayBonus } = await loadConfig();

  // 推算 streak（昨天有領才延續，沒領會重置；今天若已領則 todayClaimed=true）
  const lastYmd = state?.lastClaimedYmd || null;
  const todayClaimed = lastYmd ? isSameYmd(lastYmd, today) : false;

  let streak = state?.streak || 0;
  if (!todayClaimed && lastYmd) {
    // 只有「昨天」領過才延續，否則 streak 歸零
    if (!isYesterday(today, new Date(lastYmd))) streak = 0;
  }

  // 預覽今日金額（1–30天循環）
  const streakAfter = todayClaimed ? streak : Math.min(30, (streak || 0) + 1);
  const base = table[(streakAfter - 1 + 30) % 30] || 0;
  const isSunday = today.getDay() === 0; // 週日=0
  const amountPreview = base + (isSunday ? sundayBonus : 0);

  // nextAvailableAt：如果今天已領 → 明天 00:00；否則現在就能領
  const next = new Date(today);
  if (todayClaimed) next.setDate(next.getDate() + 1);
  const canClaim = !todayClaimed;

  return NextResponse.json({
    lastClaimedYmd: lastYmd ? new Date(lastYmd).toISOString() : null,
    streak: state?.streak || 0,
    totalClaims: state?.totalClaims || 0,
    nextAvailableAt: next.toISOString(),
    canClaim,
    todayClaimed,
    amountPreview,
    previewDetail: { base, sundayBonus: isSunday ? sundayBonus : 0, streakAfter },
  });
}
