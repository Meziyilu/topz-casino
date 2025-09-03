import prisma from '@/lib/prisma';
import { applyLedger } from '@/lib/ledger';
import { BalanceTarget, LedgerType } from '@prisma/client';

export async function claimReward(userId: string, campaignCode: string) {
  const cp = await prisma.rewardCampaign.findUnique({ where: { code: campaignCode } });
  if (!cp || !cp.enabled) throw new Error('CAMPAIGN_DISABLED');
  const claimed = await prisma.rewardClaim.findUnique({ where: { campaignId_userId: { campaignId: cp.id, userId } } });
  if (claimed && cp.claimOnce) throw new Error('ALREADY_CLAIMED');

  await prisma.rewardClaim.upsert({
    where: { campaignId_userId: { campaignId: cp.id, userId } },
    update: { amount: cp.coinAmount },
    create: { campaignId: cp.id, userId, amount: cp.coinAmount }
  });
  await applyLedger({ userId, type: LedgerType.EVENT_REWARD, target: BalanceTarget.WALLET, amount: cp.coinAmount });
  return { amount: cp.coinAmount };
}