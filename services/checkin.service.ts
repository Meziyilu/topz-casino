// services/checkin.service.ts
import prisma from "@/lib/prisma";
import { utcDayStart } from "@/lib/utils";

// 可替換為後台可調規則
function computeCheckinAmount(streakAfter: number) {
  const base = 100;
  const bonus = streakAfter % 7 === 0 ? 200 : 0;
  return base + bonus;
}

export class CheckinService {
  async status(userId: string) {
    const now = new Date();
    const ymd = utcDayStart(now);
    const [state, claimed] = await Promise.all([
      prisma.userCheckinState.findUnique({ where: { userId } }),
      prisma.dailyCheckinClaim.findUnique({
        where: { userId_ymd: { userId, ymd } },
      }),
    ]);
    return {
      today: ymd.toISOString(),
      streak: state?.streak ?? 0,
      lastClaimedYmd: state?.lastClaimedYmd ?? null,
      nextAvailableAt: state?.nextAvailableAt ?? null,
      todayClaimed: !!claimed,
    };
  }

  async claim(userId: string) {
    const ymd = utcDayStart(new Date());

    const result = await prisma.$transaction(async (tx) => {
      const exists = await tx.dailyCheckinClaim.findUnique({
        where: { userId_ymd: { userId, ymd } },
      });
      if (exists) return { ok: false as const, reason: "ALREADY_CLAIMED" };

      const state = await tx.userCheckinState.findUnique({ where: { userId } });
      const streakBefore = state?.streak ?? 0;
      const streakAfter = streakBefore + 1;
      const amount = computeCheckinAmount(streakAfter);

      await tx.dailyCheckinClaim.create({
        data: { userId, ymd, amount, streakBefore, streakAfter },
      });

      await tx.userCheckinState.upsert({
        where: { userId },
        update: {
          lastClaimedYmd: ymd,
          streak: streakAfter,
          totalClaims: (state?.totalClaims ?? 0) + 1,
          nextAvailableAt: new Date(ymd.getTime() + 86400000),
        },
        create: {
          userId,
          lastClaimedYmd: ymd,
          streak: 1,
          totalClaims: 1,
          nextAvailableAt: new Date(ymd.getTime() + 86400000),
        },
      });

      await tx.ledger.create({
        data: { userId, type: "CHECKIN_BONUS", target: "WALLET", amount },
      });

      await tx.user.update({
        where: { id: userId },
        data: { balance: { increment: amount } },
      });

      return { ok: true as const, amount, streakAfter };
    });

    if (!result.ok) {
      return { ok: false as const, error: result.reason };
    }
    return { ok: true as const, amount: result.amount, streakAfter: result.streakAfter };
  }
}

export const checkinService = new CheckinService();
