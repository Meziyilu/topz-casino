export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyRequest } from "@/lib/jwt";

/** 以「可配置的時區偏移」計算今天的 00:00:00（避免跨時區錯誤）
 *  CHECKIN_TZ_OFFSET_MINUTES：例如 +8 小時 = 480，-5 小時 = -300；預設 0（UTC）
 */
function todayYmdDate(): Date {
  const offsetMin = parseInt(process.env.CHECKIN_TZ_OFFSET_MINUTES ?? "0", 10);
  const now = new Date();
  const localMs = now.getTime() + offsetMin * 60_000;
  const local = new Date(localMs);
  const localMidnight = new Date(local.getFullYear(), local.getMonth(), local.getDate());
  // 轉回 UTC 的同一時刻
  const utcMs = localMidnight.getTime() - offsetMin * 60_000;
  return new Date(utcMs);
}

// 你可以自己調整規則：回傳下一次簽到的獎勵（以「領取後的連續天數」計算）
function calcAmount(streakAfter: number): number {
  // 例：1~7 天循環遞增；第 7 天加倍
  const table = [0, 10, 12, 15, 18, 22, 27, 40]; // index = streakAfter (1~7)
  const day = Math.max(1, Math.min(7, streakAfter));
  return table[day];
}

export async function GET(req: Request) {
  const auth = await verifyRequest(req);
  if (!auth) return NextResponse.json({ error: "UNAUTH" }, { status: 401 });

  const userId = auth.userId;
  const ymd = todayYmdDate();

  const [state, todayClaim] = await Promise.all([
    prisma.userCheckinState.findUnique({ where: { userId } }),
    prisma.dailyCheckinClaim.findUnique({ where: { userId_ymd: { userId, ymd } } })
  ]);

  const streak = state?.streak ?? 0;
  const canClaim = !todayClaim;
  const nextStreak = (streak + 1) > 7 ? 1 : (streak + 1);
  const todayAmount = canClaim ? calcAmount(nextStreak) : (todayClaim?.amount ?? 0);

  return NextResponse.json({
    canClaim,
    streak,
    totalClaims: state?.totalClaims ?? 0,
    todayClaimed: !!todayClaim,
    todayAmount,
    nextAvailableAt: canClaim ? null : new Date(ymd.getTime() + 24 * 3600 * 1000).toISOString()
  });
}

export async function POST(req: Request) {
  const auth = await verifyRequest(req);
  if (!auth) return NextResponse.json({ error: "UNAUTH" }, { status: 401 });

  const userId = auth.userId;
  const ymd = todayYmdDate();

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 先鎖定當前 state（用 upsert + for update 效果）
      const state = await tx.userCheckinState.upsert({
        where: { userId },
        update: {},
        create: { userId }
      });

      // 今天是否已領
      const exists = await tx.dailyCheckinClaim.findUnique({ where: { userId_ymd: { userId, ymd } } });
      if (exists) {
        return { already: true, claim: exists, state };
      }

      const streakBefore = state.streak ?? 0;
      const streakAfter = streakBefore + 1 > 7 ? 1 : streakBefore + 1;
      const amount = calcAmount(streakAfter);

      // 建立領取紀錄
      const claim = await tx.dailyCheckinClaim.create({
        data: { userId, ymd, amount, streakBefore, streakAfter }
      });

      // 加錢到錢包 + 新增 ledger
      await tx.user.update({
        where: { id: userId },
        data: { balance: { increment: amount } }
      });
      await tx.ledger.create({
        data: {
          userId,
          type: "CHECKIN_BONUS",
          target: "WALLET",
          amount
        }
      });

      // 更新 state
      await tx.userCheckinState.update({
        where: { userId },
        data: {
          streak: streakAfter,
          totalClaims: { increment: 1 },
          lastClaimedYmd: ymd,
          nextAvailableAt: new Date(ymd.getTime() + 24 * 3600 * 1000)
        }
      });

      return { already: false, claim, amount, streakAfter };
    });

    if (result.already) {
      return NextResponse.json({ ok: true, already: true, claim: result.claim });
    }

    return NextResponse.json({
      ok: true,
      already: false,
      amount: result.amount,
      streakAfter: result.streakAfter
    });
  } catch (e) {
    // 競態（同時點擊）會被 unique([userId, ymd]) 擋下，這裡視為已領
    return NextResponse.json({ ok: true, already: true }, { status: 200 });
  }
}
