export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth"; // ← 用你現有的登入驗證

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
      if (Array.isArray(parsed) && parsed.length === 30) {
        table = parsed.map((v) => Number(v || 0));
      }
    }
  } catch {}
  const sundayBonus = Number(sundayCfg?.valueInt ?? 0);
  return { table, sundayBonus: isNaN(sundayBonus) ? 0 : sundayBonus };
}

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const userId = user.id;

  const today = ymdDate();
  const state = await prisma.userCheckinState.findUnique({ where: { userId } });
  const { table, sundayBonus } = await loadConfig();

  const lastYmd = state?.lastClaimedYmd || null;
  const todayClaimed = lastYmd ? isSameYmd(lastYmd, today) : false;

  // streak 今天已領就顯示目前值；未領則只有昨天有領才延續，否則視為中斷
  let effectiveStreak = state?.streak || 0;
  if (!todayClaimed && lastYmd && !isYesterday(today, new Date(lastYmd))) {
    effectiveStreak = 0;
  }

  const streakAfter = todayClaimed ? effectiveStreak : Math.min(30, effectiveStreak + 1);
  const base = table[(streakAfter - 1 + 30) % 30] || 0;
  const isSunday = today.getDay() === 0;
  const amountPreview = base + (isSunday ? sundayBonus : 0);

  const next = new Date(today);
  if (todayClaimed) next.setDate(next.getDate() + 1);

  return NextResponse.json({
    lastClaimedYmd: lastYmd ? new Date(lastYmd).toISOString() : null,
    streak: state?.streak || 0,
    totalClaims: state?.totalClaims || 0,
    nextAvailableAt: next.toISOString(),
    canClaim: !todayClaimed,
    todayClaimed,
    amountPreview,
    previewDetail: { base, sundayBonus: isSunday ? sundayBonus : 0, streakAfter },
  });
}
