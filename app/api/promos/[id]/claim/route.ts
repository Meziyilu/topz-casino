// app/(player-suite)/api/promos/[id]/claim/route.ts
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyRequest } from "@/lib/jwt";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = verifyRequest(req);
  if (!auth?.sub) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const userId = auth.sub as string;

  const now = new Date();
  const campaign = await prisma.rewardCampaign.findUnique({ where: { id: params.id } });
  if (!campaign || !campaign.enabled) {
    return NextResponse.json({ error: "NOT_FOUND_OR_DISABLED" }, { status: 404 });
  }
  if (campaign.startAt && campaign.startAt > now) return NextResponse.json({ error: "NOT_STARTED" }, { status: 409 });
  if (campaign.endAt && campaign.endAt <= now) return NextResponse.json({ error: "ENDED" }, { status: 409 });

  const already = await prisma.rewardClaim.findUnique({
    where: { campaignId_userId: { campaignId: campaign.id, userId } }
  });
  if (already && campaign.claimOnce) {
    return NextResponse.json({ error: "ALREADY_CLAIMED" }, { status: 409 });
  }

  // 若為 TOPUP 類，檢查儲值達標
  if (campaign.kind === "TOPUP") {
    const minAmt = campaign.minTopupAmount ?? 0;
    const since  = campaign.topupSince ?? new Date(0);
    const until  = campaign.topupUntil ?? new Date(8640000000000000); // max

    // 以 ExternalTopup 為依據（你也可改以 Ledger.EXTERNAL_TOPUP 彙總）
    const sumTopup = await prisma.externalTopup.aggregate({
      _sum: { amount: true },
      where: {
        userId,
        status: "COMPLETED",
        createdAt: { gte: since, lt: until }
      }
    });
    const total = sumTopup._sum.amount ?? 0;
    if (total < minAmt) {
      return NextResponse.json({ error: "TOPUP_NOT_ENOUGH", needed: minAmt, total }, { status: 403 });
    }
  }

  // 領取（transaction）
  const result = await prisma.$transaction(async (tx) => {
    // 以唯一鍵擋重複
    const claimed = await tx.rewardClaim.findUnique({
      where: { campaignId_userId: { campaignId: campaign.id, userId } }
    });
    if (claimed && campaign.claimOnce) {
      return { ok: false as const, reason: "ALREADY_CLAIMED" };
    }

    const amount = campaign.coinAmount ?? 0;

    await tx.rewardClaim.upsert({
      where: { campaignId_userId: { campaignId: campaign.id, userId } },
      update: {},
      create: { campaignId: campaign.id, userId, amount }
    });

    // 寫 Ledger（區分 EVENT / TOPUP）
    await tx.ledger.create({
      data: {
        userId,
        type: (campaign.kind === "TOPUP") ? "TOPUP_BONUS" : "EVENT_REWARD",
        target: "WALLET",
        amount
      }
    });

    // 更新餘額（若你平常由 Ledger pipeline 統一處理，這段可移除）
    await tx.user.update({ where: { id: userId }, data: { balance: { increment: amount } } });

    return { ok: true as const, amount };
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 409 });
  }

  return NextResponse.json({ amount: result.amount });
}
