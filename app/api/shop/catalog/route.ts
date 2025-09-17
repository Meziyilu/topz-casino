// app/api/shop/catalog/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  // 直接 Prisma 讀資料
  const rows = await prisma.shopItem.findMany({
    where: { visible: true },
    include: {
      skus: {
        select: {
          id: true,
          priceOverride: true,
          currencyOverride: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const items = rows.map((it) => {
    // 取最低價與顯示幣別（優先看 SKU 覆蓋；若沒有就用商品 basePrice / currency）
    const prices = it.skus
      .map((s) => ({
        price: s.priceOverride ?? it.basePrice,
        currency: s.currencyOverride ?? it.currency,
      }))
      .filter((p) => p.price != null);

    const priceFrom = prices.length
      ? Math.min(...prices.map((p) => (p.price as number)))
      : (it.basePrice as number);

    return {
      id: it.id,
      code: it.code,
      title: it.title,
      imageUrl: it.imageUrl,
      kind: it.kind, // e.g. "HEADFRAME"
      currency: it.currency as "COIN" | "DIAMOND" | "TICKET" | "GACHA_TICKET",
      priceFrom,
      limitedQty: it.limitedQty,
    };
  });

  return NextResponse.json({ items });
}
