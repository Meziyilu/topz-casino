// services/reward.service.ts
import prisma from "@/lib/prisma";

export type ActivePromo = {
  id: string;
  code: string;
  kind: "EVENT" | "TOPUP";
  title: string;
  subtitle: string | null;
  body: string | null;
  imageUrl: string | null;
  coinAmount: number;
};

export class RewardService {
  async getActivePromosForLogin(userId: string) {
    const now = new Date();
    const list = await prisma.rewardCampaign.findMany({
      where: {
        enabled: true,
        popupTrigger: "LOGIN",
        AND: [
          { OR: [{ startAt: null }, { startAt: { lte: now } }] },
          { OR: [{ endAt: null }, { endAt: { gt: now } }] },
        ],
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    });

    const eventPromo = list.find((x) => x.kind === "EVENT");
    const topupPromo = list.find((x) => x.kind === "TOPUP");

    const items: ActivePromo[] = [eventPromo, topupPromo]
      .filter((x): x is NonNullable<typeof x> => !!x)
      .map((x) => ({
        id: x.id,
        code: x.code,
        kind: x.kind,
        title: x.title,
        subtitle: x.subtitle ?? null,
        body: x.body ?? null,
        imageUrl: x.imageUrl ?? null,
        coinAmount: x.coinAmount,
      }));

    return { items };
  }

  async claim(userId: string, campaignId: string) {
    const now = new Date();
    const campaign = await prisma.rewardCampaign.findUnique({
      where: { id: campaignId },
    });
    if (!campaign || !campaign.enabled) {
      return { ok: false as const, error: "NOT_FOUND_OR_DISABLED" };
    }
    if (campaign.startAt && campaign.startAt > now) {
      return { ok: false as const, error: "NOT_STARTED" };
    }
    if (campaign.endAt && campaign.endAt <= now) {
      return { ok: false as const, error: "ENDED" };
    }

    const already = await prisma.rewardClaim.findUnique({
      where: { campaignId_userId: { campaignId, userId } },
    });
    if (already && campaign.claimOnce) {
      return { ok: false as const, error: "ALREADY_CLAIMED" };
    }

    if (campaign.kind === "TOPUP") {
      const minAmt = campaign.minTopupAmount ?? 0;
      const since = campaign.topupSince ?? new Date(0);
      const until = campaign.topupUntil ?? new Date(8640000000000000);
      const sumTopup = await prisma.externalTopup.aggregate({
        _sum: { amount: true },
        where: {
          userId,
          status: "COMPLETED",
          createdAt: { gte: since, lt: until },
        },
      });
      const total = sumTopup._sum.amount ?? 0;
      if (total < minAmt) {
        return {
          ok: false as const,
          error: "TOPUP_NOT_ENOUGH",
          needed: minAmt,
          total,
        };
      }
    }

    // 領取
    const result = await prisma.$transaction(async (tx) => {
      await tx.rewardClaim.upsert({
        where: { campaignId_userId: { campaignId, userId } },
        update: {},
        create: { campaignId, userId, amount: campaign.coinAmount ?? 0 },
      });

      const type = campaign.kind === "TOPUP" ? "TOPUP_BONUS" : "EVENT_REWARD";
      const amount = campaign.coinAmount ?? 0;

      await tx.ledger.create({
        data: { userId, type, target: "WALLET", amount },
      });
      await tx.user.update({
        where: { id: userId },
        data: { balance: { increment: amount } },
      });

      return { amount };
    });

    return { ok: true as const, amount: result.amount };
  }
}

export const rewardService = new RewardService();
