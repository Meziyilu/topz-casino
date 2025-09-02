// app/(player-suite)/api/promos/active/route.ts
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyRequest } from "@/lib/jwt";

export async function GET(req: Request) {
  const auth = verifyRequest(req);
  if (!auth?.sub) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const now = new Date();
  const list = await prisma.rewardCampaign.findMany({
    where: {
      enabled: true,
      popupTrigger: "LOGIN",
      AND: [
        { OR: [ { startAt: null }, { startAt: { lte: now } } ] },
        { OR: [ { endAt: null }, { endAt: { gt: now } } ] },
      ]
    },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }]
  });

  // 各取一個：EVENT、TOPUP
  const eventPromo = list.find(x => x.kind === "EVENT") ?? null;
  const topupPromo = list.find(x => x.kind === "TOPUP") ?? null;

  return NextResponse.json({
    items: [eventPromo, topupPromo].filter(Boolean)
  });
}
