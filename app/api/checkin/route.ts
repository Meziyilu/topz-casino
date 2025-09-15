export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyRequest } from "@/lib/jwt";

/** 依時區偏移計算「今天 00:00:00」的 UTC 時刻 */
function todayYmdDate(): Date {
  const offsetMin = parseInt(process.env.CHECKIN_TZ_OFFSET_MINUTES ?? "0", 10);
  const now = new Date();
  const localMs = now.getTime() + offsetMin * 60_000;
  const local = new Date(localMs);
  const localMidnight = new Date(local.getFullYear(), local.getMonth(), local.getDate());
  const utcMs = localMidnight.getTime() - offsetMin * 60_000;
  return new Date(utcMs);
}

// ✅ 依「領取後連續天數」回傳獎勵金額：1~6 天 1000，第 7 天 10000
function calcAmount(streakAfter: number): number {
  return streakAfter === 7 ? 10_000 : 1_000;
}

type MaybeAuth =
  | { userId: string; isAdmin: boolean }
  | { sub: string; isAdmin?: boolean }
  | null;

export async function GET(req: Request) {
  const auth = (await verifyRequest(req)) as MaybeAuth;
  if (!auth) return NextResponse.json({ error: "UNAUTH" }, { status: 401 });

  // 兼容 userId / sub 兩種格式
  const userId = ("userId" in auth ? auth.userId : auth.sub) as string;
  const ymd = todayYmdDate();

  const [state, todayClaim] = await Promise.all([
    prisma.userCheckinState.findUnique({ where: { userId } }),
    prisma.dailyCheckinClaim.findUnique({ where: { userId_ymd: { userId, ymd } } }),
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
    nextAvailableAt: canClaim ? null : new Date(ymd.getTime() + 24 * 3600 * 1000).toISOString(),
  });
}

export async function POST(req: Request) {
  const auth = (await verifyRequest(req)) as MaybeAuth;
  if (!auth) return NextResponse.json({ error: "UNAUTH" }, { status: 401 });

  const userId = ("userId" in auth ? auth.userId : auth.sub) as string;
  const ymd = todayYmdDate();

  try {
    const result = await prisma.$transaction(async (tx) => {
      const state = await tx.userCheckinState.upsert({
        where: { userId },
        update: {},
        create: { userId },
      });

      const exists = await tx.dailyCheckinClaim.findUnique({
        where: { userId_ymd: { userId, ymd } },
      });
      if (exists) return { already: true, claim: exists };

      const streakBefore = state.streak ?? 0;
      const streakAfter = streakBefore + 1 > 7 ? 1 : streakBefore + 1;
      const amount = calcAmount(streakAfter);

      const claim = await tx.dailyCheckinClaim.create({
        data: { userId, ymd, amount, streakBefore, streakAfter },
      });

      await tx.user.update({
        where: { id: userId },
        data: { balance: { increment: amount } },
      });

      await tx.ledger.create({
        data: { userId, type: "CHECKIN_BONUS", target: "WALLET", amount },
      });

      await tx.userCheckinState.update({
        where: { userId },
        data: {
          streak: streakAfter,
          totalClaims: { increment: 1 },
          lastClaimedYmd: ymd,
          nextAvailableAt: new Date(ymd.getTime() + 24 * 3600 * 1000),
        },
      });

      return { already: false, amount, streakAfter, claim };
    });

    return NextResponse.json(
      result.already
        ? { ok: true, already: true, claim: result.claim }
        : { ok: true, already: false, amount: result.amount, streakAfter: result.streakAfter }
    );
  } catch {
    // 競態被 unique([userId, ymd]) 擋下，視為已領
    return NextResponse.json({ ok: true, already: true }, { status: 200 });
  }
}
