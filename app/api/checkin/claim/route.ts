// app/(player-suite)/api/checkin/claim/route.ts
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyRequest } from "@/lib/jwt";

function todayYmdUTC() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0,0,0));
}

// 你可替換為更複雜的獎勵規則（例如連續 x 天加成）
function computeCheckinAmount(streakAfter: number) {
  // 範例：固定 100，且每滿 7 天 +200 獎勵
  const base = 100;
  const bonus = (streakAfter % 7 === 0) ? 200 : 0;
  return base + bonus;
}

export async function POST(req: Request) {
  const auth = verifyRequest(req);
  if (!auth?.sub) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const userId = auth.sub as string;

  const ymd = todayYmdUTC();

  const result = await prisma.$transaction(async (tx) => {
    const exists = await tx.dailyCheckinClaim.findUnique({ where: { userId_ymd: { userId, ymd } } });
    if (exists) return { ok: false as const, reason: "ALREADY_CLAIMED" };

    const state = await tx.userCheckinState.findUnique({ where: { userId } });

    // 簡易續天判斷：昨天是否有領（你也可用 nextAvailableAt 判斷）
    let streakBefore = state?.streak ?? 0;
    let streakAfter = streakBefore + 1;

    const amount = computeCheckinAmount(streakAfter);

    await tx.dailyCheckinClaim.create({
      data: {
        userId, ymd, amount, streakBefore, streakAfter
      }
    });

    await tx.userCheckinState.upsert({
      where: { userId },
      update: {
        lastClaimedYmd: ymd,
        streak: streakAfter,
        totalClaims: (state?.totalClaims ?? 0) + 1,
        nextAvailableAt: new Date(ymd.getTime() + 24*3600*1000),
      },
      create: {
        userId,
        lastClaimedYmd: ymd,
        streak: 1,
        totalClaims: 1,
        nextAvailableAt: new Date(ymd.getTime() + 24*3600*1000),
      }
    });

    // 寫入錢包帳（CHECKIN_BONUS）
    await tx.ledger.create({
      data: {
        userId,
        type: "CHECKIN_BONUS",
        target: "WALLET",
        amount,
      }
    });

    // 同步增加 User.balance（若你平時由 Ledger 統一驅動餘額，這段可省略）
    await tx.user.update({
      where: { id: userId },
      data: { balance: { increment: amount } }
    });

    return { ok: true as const, amount, streakAfter };
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 409 });
  }
  return NextResponse.json({ amount: result.amount, streakAfter: result.streakAfter });
}
