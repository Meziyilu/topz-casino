export const runtime = "nodejs"; export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { z } from "zod";

const zCreate = z.object({
  kind: z.enum(["HEADFRAME","BADGE","BUNDLE","CURRENCY","OTHER"]),
  currency: z.enum(["COIN","DIAMOND","TICKET","GACHA_TICKET"]).default("COIN"),
  code: z.string().min(2),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  basePrice: z.number().int().min(0),
  vipDiscountable: z.boolean().optional().default(true),
  limitedQty: z.number().int().min(0).optional().nullable(),
  startAt: z.string().datetime().optional().nullable(),
  endAt: z.string().datetime().optional().nullable(),
  visible: z.boolean().optional().default(true),
  skus: z.array(z.object({
    priceOverride: z.number().int().min(0).optional().nullable(),
    vipDiscountableOverride: z.boolean().optional().nullable(),
    currencyOverride: z.enum(["COIN","DIAMOND","TICKET","GACHA_TICKET"]).optional().nullable(),
    payloadJson: z.any(),
  })).min(1),
}).strict();

export async function POST(req: Request) {
  const auth = await getUserFromRequest(req).catch(()=>null);
  if (!auth?.isAdmin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const body = await req.json().catch(()=>null);
  const p = zCreate.safeParse(body);
  if (!p.success) return NextResponse.json({ error: "BAD_BODY" }, { status: 400 });

  const c = p.data;
  const created = await prisma.shopItem.create({
    data: {
      kind: c.kind, currency: c.currency, code: c.code, title: c.title,
      description: c.description ?? null, imageUrl: c.imageUrl ?? null,
      basePrice: c.basePrice, vipDiscountable: c.vipDiscountable,
      limitedQty: c.limitedQty ?? null,
      startAt: c.startAt ? new Date(c.startAt) : null,
      endAt: c.endAt ? new Date(c.endAt) : null,
      visible: c.visible,
      skus: {
        create: c.skus.map(s => ({
          priceOverride: s.priceOverride ?? null,
          vipDiscountableOverride: s.vipDiscountableOverride ?? null,
          currencyOverride: s.currencyOverride ?? null,
          payloadJson: s.payloadJson,
        })),
      },
    },
    include: { skus: true },
  });
  return NextResponse.json({ item: created });
}
