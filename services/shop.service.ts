import prisma from "@/lib/prisma";
import { isOnSaleWindow, pickVipRate, addDays } from "@/lib/shop";

type Currency = "COIN"|"DIAMOND"|"TICKET"|"GACHA_TICKET";
function resolveCurrency(itemCurrency: Currency, skuCurrency?: Currency): Currency { return skuCurrency ?? itemCurrency; }
function ledgerTargetOf(currency: Currency){ return currency==="COIN"?"WALLET":(currency as any); }

async function getActiveDiscountPercent(params:{ userVip:number; itemKind:string; itemCode:string; }){
  const t = new Date();
  const rules = await prisma.discountRule.findMany({
    where: {
      enabled: true,
      OR: [{ scope:"ALL" }, { scope:"KIND", targetCode: params.itemKind }, { scope:"ITEM", targetCode: params.itemCode }],
      AND: [{ OR:[{startAt:null},{startAt:{lte:t}}] }, { OR:[{endAt:null},{endAt:{gte:t}}] }]
    },
    orderBy: [{ percentOff: "desc" }],
  });
  for (const r of rules){ if (r.vipMin!=null && params.userVip<r.vipMin) continue; if (r.percentOff && r.percentOff>0) return r.percentOff; }
  return 0;
}

export async function computePrice(skuId: string, qty: number, vipTier: number){
  const sku = await prisma.shopSku.findUnique({ where:{id:skuId}, include:{ item:true } });
  if (!sku || !sku.item || !sku.item.visible) throw new Error("SKU_NOT_FOUND");
  const item = sku.item;
  if (!isOnSaleWindow(item.startAt, item.endAt)) throw new Error("ITEM_NOT_ON_SALE");
  if (item.limitedQty != null && item.limitedQty <= 0) throw new Error("ITEM_SOLD_OUT");

  const currency = resolveCurrency(item.currency as Currency, sku.currencyOverride as Currency|undefined);
  const unitBase = sku.priceOverride ?? item.basePrice;

  const percentOff = await getActiveDiscountPercent({ userVip: vipTier, itemKind: item.kind, itemCode: item.code });
  const activityRate = percentOff>0 ? Math.max(0, 1 - percentOff/100) : 1.0;
  const vipEligible = sku.vipDiscountableOverride ?? item.vipDiscountable;
  const vipRate = vipEligible ? pickVipRate(vipTier) : 1.0;

  const unitFinal = Math.max(0, Math.round(unitBase * activityRate * vipRate));
  const total = unitFinal * qty;

  return { item, sku, currency, unitBase, activityRate, vipRate, unitFinal, total };
}

async function ensureBalanceAndDecrement(tx:any, userId:string, currency:Currency, amount:number){
  const u = await tx.user.findUnique({
    where:{ id:userId },
    select:{ balance:true, diamondBalance:true, ticketBalance:true, gachaTicketBalance:true },
  });
  if (!u) throw new Error("USER_NOT_FOUND");
  const ok =
    (currency==="COIN" && u.balance>=amount) ||
    (currency==="DIAMOND" && u.diamondBalance>=amount) ||
    (currency==="TICKET" && u.ticketBalance>=amount) ||
    (currency==="GACHA_TICKET" && u.gachaTicketBalance>=amount);
  if (!ok) throw new Error("INSUFFICIENT_BALANCE");

  const data:any = {};
  if (currency==="COIN") data.balance = { decrement: amount };
  if (currency==="DIAMOND") data.diamondBalance = { decrement: amount };
  if (currency==="TICKET") data.ticketBalance = { decrement: amount };
  if (currency==="GACHA_TICKET") data.gachaTicketBalance = { decrement: amount };
  await tx.user.update({ where:{ id:userId }, data });
}

async function creditCurrency(tx:any, userId:string, currency:Currency, amount:number){
  const data:any = {};
  if (currency==="COIN") data.balance = { increment: amount };
  if (currency==="DIAMOND") data.diamondBalance = { increment: amount };
  if (currency==="TICKET") data.ticketBalance = { increment: amount };
  if (currency==="GACHA_TICKET") data.gachaTicketBalance = { increment: amount };
  await tx.user.update({ where:{ id:userId }, data });
}

export async function performCheckout(args:{ userId:string; skuId:string; qty:number; idempotencyKey:string; vipTier:number; }){
  return await prisma.$transaction(async (tx)=>{
    const existed = await tx.shopPurchase.findUnique({ where:{ idempotencyKey: args.idempotencyKey } });
    if (existed) return existed;

    const priced = await computePrice(args.skuId, args.qty, args.vipTier);

    if (priced.item.limitedQty != null){
      const updated = await tx.shopItem.updateMany({
        where:{ id: priced.item.id, limitedQty: { gte: args.qty } }, data:{ limitedQty: { decrement: args.qty } },
      });
      if (updated.count===0) throw new Error("INVENTORY_SHORTAGE");
    }

    await ensureBalanceAndDecrement(tx, args.userId, priced.currency as Currency, priced.total);

    await tx.ledger.create({
      data: {
        userId: args.userId,
        type: "SHOP_PURCHASE",
        target: ledgerTargetOf(priced.currency as Currency),
        amount: -priced.total,
        meta: { source:"SHOP_PURCHASE", currency: priced.currency, itemCode: priced.item.code, skuId: args.skuId, qty: args.qty, unitFinal: priced.unitFinal },
      }
    });

    const payload = priced.sku.payloadJson as any;

    if (priced.item.kind === "CURRENCY") {
      const giveCurrency = (payload?.currency as Currency) || (priced.currency as Currency);
      const giveAmount = Number(payload?.amount ?? 0) * args.qty;
      if (giveAmount > 0) await creditCurrency(tx, args.userId, giveCurrency, giveAmount);
    }
    else if (priced.item.kind === "HEADFRAME" && payload?.headframe) {
      const code = String(payload.headframe) as any;
      const days = Number(payload?.durationDays ?? 0) * args.qty;
      const existing = await tx.userHeadframe.findUnique({ where: { userId_code: { userId: args.userId, code } } });
      const base = existing?.expiresAt && existing.expiresAt > new Date() ? existing.expiresAt : new Date();
      const newExpires = days>0 ? addDays(base, days) : null;
      await tx.userHeadframe.upsert({
        where: { userId_code: { userId: args.userId, code } },
        create: { userId: args.userId, code, expiresAt: newExpires ?? undefined },
        update: { expiresAt: newExpires ?? null },
      });
    }
    else if (priced.item.kind === "BADGE" && payload?.badgeCode) {
      const badge = await tx.badge.findUnique({ where: { code: String(payload.badgeCode) } });
      if (badge) {
        await tx.userBadge.upsert({
          where: { userId_badgeId: { userId: args.userId, badgeId: badge.id } },
          create: { userId: args.userId, badgeId: badge.id },
          update: {},
        });
      }
    }
    else if (priced.item.kind === "BUNDLE"){
      const entries = await tx.shopBundleEntry.findMany({ where:{ itemId: priced.item.id }, include:{ sku:{ include:{ item:true } } } });
      for (const e of entries){
        const sub = e.sku; const p2 = sub.payloadJson as any;
        for (let i=0;i<e.qty*args.qty;i++){
          if (sub.item.kind==="CURRENCY"){
            const giveCurrency = (p2?.currency as Currency) || (sub.currencyOverride as Currency) || (sub.item.currency as Currency);
            const giveAmount = Number(p2?.amount ?? 0);
            if (giveAmount > 0) await creditCurrency(tx, args.userId, giveCurrency, giveAmount);
          } else if (sub.item.kind==="HEADFRAME" && p2?.headframe){
            const code = String(p2.headframe) as any;
            const days = Number(p2?.durationDays ?? 0);
            const existing = await tx.userHeadframe.findUnique({ where: { userId_code: { userId: args.userId, code } } });
            const base = existing?.expiresAt && existing.expiresAt > new Date() ? existing.expiresAt : new Date();
            const newExpires = days>0 ? addDays(base, days) : null;
            await tx.userHeadframe.upsert({
              where: { userId_code: { userId: args.userId, code } },
              create: { userId: args.userId, code, expiresAt: newExpires ?? undefined },
              update: { expiresAt: newExpires ?? null },
            });
          } else if (sub.item.kind==="BADGE" && p2?.badgeCode){
            const badge = await tx.badge.findUnique({ where: { code: String(p2.badgeCode) } });
            if (badge) {
              await tx.userBadge.upsert({
                where: { userId_badgeId: { userId: args.userId, badgeId: badge.id } },
                create: { userId: args.userId, badgeId: badge.id },
                update: {},
              });
            }
          }
        }
      }
    }

    return await tx.shopPurchase.create({
      data: {
        userId: args.userId, skuId: args.skuId, qty: args.qty,
        pricePaid: priced.total,
        vipDiscountRate: priced.unitFinal / (priced.sku.priceOverride ?? priced.item.basePrice),
        idempotencyKey: args.idempotencyKey,
      },
    });
  });
}
