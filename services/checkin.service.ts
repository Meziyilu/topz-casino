import prisma from '@/lib/prisma';
import { applyLedger } from '@/lib/ledger';
import { BalanceTarget, LedgerType } from '@prisma/client';

export async function claimCheckin(userId: string) {
  const now = new Date();
  return prisma.$transaction(async (tx) => {
    const st = await tx.userCheckinState.upsert({
      where: { userId },
      update: {},
      create: { userId }
    });
    // 簡化：每天一次
    const ymd = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const exists = await tx.dailyCheckinClaim.findUnique({ where: { userId_ymd: { userId, ymd } } });
    if (exists) throw new Error('ALREADY_CLAIMED');

    const streakBefore = st.streak;
    const streakAfter = streakBefore + 1;
    const amount = 50; // 固定 50，可改為 GameConfig

    await tx.dailyCheckinClaim.create({ data: { userId, ymd, amount, streakBefore, streakAfter } });
    await tx.userCheckinState.update({ where: { userId }, data: { streak: streakAfter, lastClaimedYmd: ymd } });
    await applyLedger({ userId, type: LedgerType.CHECKIN_BONUS, target: BalanceTarget.WALLET, amount });
    return { amount, streakAfter };
  });
}