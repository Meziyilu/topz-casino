export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function getUserIdFromCookie(req: Request): Promise<string | null> {
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
  const sundayBonus = Number(sundayCfg?.valueInt || 0);
  return { table, sundayBonus: isNaN(sundayBonus) ? 0 : sundayBonus };
}

export async function POST(req: Request) {
  const userId = await getUserIdFromCookie(req);
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const today = ymdDate();
  const todayIso = ymdKey(today);

  const { table, sundayBonus } = await loadConfig();

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 先鎖狀態
      const state = await tx.userCheckinState.findUnique({ where: { userId }, lock: { mode: "ForUpdate" } }).catch(() => null);
      const lastYmd = state?.lastClaimedYmd || null;

      // 已領就拒
      if (lastYmd && isSameYmd(lastYmd, today)) {
        return { claimed: false, reason: "ALREADY_CLAIMED" as const };
      }

      // 計算 streak
      let streakBefore = state?.streak || 0;
      let streak = streakBefore;

      if (!lastYmd) {
        streak = 0;
      } else if (isYesterday(today, new Date(lastYmd))) {
        // 連續
        // streak 保持
      } else {
        // 斷了
        streak = 0;
      }

      const streakAfter = Math.min(30, streak + 1);
      const base = table[(streakAfter - 1 + 30) % 30] || 0;
      const isSunday = today.getDay() === 0;
      const amount = base + (isSunday ? sundayBonus : 0);

      // 新增一筆 claim
      const claim = await tx.dailyCheckinClaim.create({
        data: {
          userId,
          ymd: today,
          amount,
          streakBefore,
          streakAfter,
        },
      });

      // 更新 user 狀態
      const newTotal = (state?.totalClaims || 0) + 1;
      await tx.userCheckinState.upsert({
        where: { userId },
        update: {
          lastClaimedYmd: today,
          streak: streakAfter,
          totalClaims: newTotal,
          nextAvailableAt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        },
        create: {
          userId,
          lastClaimedYmd: today,
          streak: streakAfter,
          totalClaims: 1,
          nextAvailableAt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        },
      });

      // 記帳到 Ledger、加錢到錢包
      await tx.ledger.create({
        data: {
          userId,
          type: "CHECKIN_BONUS",
          target: "WALLET",
          amount,
          createdAt: new Date(),
          meta: { reason: "DAILY_CHECKIN", claimId: claim.id },
        } as any,
      });
      await tx.user.update({
        where: { id: userId },
        data: { balance: { increment: amount } },
      });

      return { claimed: true, claim, amount, base, sundayBonus: isSunday ? sundayBonus : 0, streakAfter };
    });

    return NextResponse.json(result);
  } catch (e: any) {
    // Prisma rethrow 也用 JSON 回，避免前端讀 JSON 失敗
    return NextResponse.json({ error: "SERVER_ERROR", detail: String(e?.message || e) }, { status: 500 });
  }
}
