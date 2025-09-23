export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import type { Prisma } from "@prisma/client";

function ymdDate(d = new Date()) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
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
  const sundayBonus = Number(sundayCfg?.valueInt ?? 0);
  return { table, sundayBonus: isNaN(sundayBonus) ? 0 : sundayBonus };
}

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const userId = user.id;

  const today = ymdDate();
  const { table, sundayBonus } = await loadConfig();

  try {
    const result = await prisma.$transaction(async (tx) => {
      const state = await tx.userCheckinState.findUnique({ where: { userId } });
      const lastYmd = state?.lastClaimedYmd || null;

      if (lastYmd && isSameYmd(lastYmd, today)) {
        return { claimed: false, reason: "ALREADY_CLAIMED" as const };
      }

      // 計算連續
      const streakBefore = state?.streak ?? 0;
      let baseStreak = streakBefore;
      if (!lastYmd || !isYesterday(today, new Date(lastYmd))) baseStreak = 0;

      const streakAfter = Math.min(30, baseStreak + 1);
      const base = table[(streakAfter - 1 + 30) % 30] || 0;
      const isSunday = today.getDay() === 0;
      const amount = base + (isSunday ? sundayBonus : 0);

      // 寫入當日領取（靠 schema 的 @@unique([userId, ymd]) 防併發）
      let claim;
      try {
        claim = await tx.dailyCheckinClaim.create({
          data: { userId, ymd: today, amount, streakBefore, streakAfter },
        });
      } catch (e: any) {
        if ((e as Prisma.PrismaClientKnownRequestError)?.code === "P2002") {
          return { claimed: false, reason: "ALREADY_CLAIMED" as const };
        }
        throw e;
      }

      // 更新狀態
      const nextAvail = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      await tx.userCheckinState.upsert({
        where: { userId },
        update: {
          lastClaimedYmd: today,
          streak: streakAfter,
          totalClaims: (state?.totalClaims ?? 0) + 1,
          nextAvailableAt: nextAvail,
        },
        create: {
          userId,
          lastClaimedYmd: today,
          streak: streakAfter,
          totalClaims: 1,
          nextAvailableAt: nextAvail,
        },
      });

      // 記帳＋加錢到錢包
      await tx.ledger.create({
        data: {
          userId,
          type: "CHECKIN_BONUS",
          target: "WALLET",
          amount,
          meta: { reason: "DAILY_CHECKIN", ymd: today.toISOString() },
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
    return NextResponse.json({ error: "SERVER_ERROR", detail: String(e?.message || e) }, { status: 500 });
  }
}
