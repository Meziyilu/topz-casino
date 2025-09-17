export const runtime = "nodejs"; export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { isOnSaleWindow, pickVipRate } from "@/lib/shop";
import { getUserFromRequest } from "@/lib/auth";

export async function GET() {
  const auth = await getUserFromRequest(new Request("")).catch(()=>null);
  const vip = auth?.user?.vipTier ?? 0;

  const items = await prisma.shopItem.findMany({ where: { visible: true }, include: { skus: true }, orderBy: [{ createdAt: "desc" }] });
  const t = new Date();
  const out = items.filter(i=>isOnSaleWindow(i.startAt, i.endAt, t)).map(i=>{
    const vipRate = i.vipDiscountable ? pickVipRate(vip) : 1.0;
    const prices = i.skus.map(s=>{
      const unitBase = s.priceOverride ?? i.basePrice;
      const vipEligible = (s.vipDiscountableOverride ?? i.vipDiscountable) ? vipRate : 1.0;
      return Math.max(0, Math.round(unitBase * vipEligible));
    });
    const minPrice = prices.length? Math.min(...prices): i.basePrice;
    return { id: i.id, code: i.code, title: i.title, imageUrl: i.imageUrl ?? null, kind: i.kind, currency: i.currency, priceFrom: minPrice, limitedQty: i.limitedQty ?? null };
  });
  return NextResponse.json({ items: out });
}
