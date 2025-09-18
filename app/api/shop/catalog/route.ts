export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const rows = await prisma.shopItem.findMany({
      where: { visible: true },
      include: { skus: { select: { priceOverride: true, currencyOverride: true } } },
      orderBy: { createdAt: "desc" },
    });

    const items = rows.map((it) => {
      const skPrices = it.skus?.length
        ? it.skus.map((s) => s.priceOverride ?? 0)
        : [(it as any).basePrice ?? 0];
      const priceFrom = Math.max(0, Math.min(...skPrices));
      return {
        id: it.id,
        code: it.code,
        title: it.title,
        imageUrl: (it as any).imageUrl ?? null,
        kind: it.kind,
        currency: it.currency,
        priceFrom,
        limitedQty: (it as any).limitedQty ?? null,
      };
    });

    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [] }, { status: 200 }); // 不要 500/404 讓前端掛掉
  }
}
