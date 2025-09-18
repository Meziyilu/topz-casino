// app/api/shop/catalog/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const rows = await prisma.shopItem.findMany({
      where: { visible: true },
      include: {
        skus: { select: { priceOverride: true, currencyOverride: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const items = rows.map((it) => {
      const prices = it.skus.length
        ? it.skus.map((s) => s.priceOverride ?? it.basePrice ?? 0)
        : [it.basePrice ?? 0];
      const priceFrom = Math.max(0, Math.min(...prices));
      return {
        id: it.id,
        code: it.code,
        title: it.title,
        imageUrl: it.imageUrl,
        kind: it.kind,
        currency: it.currency,
        priceFrom,
        limitedQty: it.limitedQty ?? null,
      };
    });

    return NextResponse.json({ items }); // ✅ 就算空陣列也 200
  } catch (e) {
    // 真的出錯才回 500（不要 404）
    return NextResponse.json({ items: [], error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
