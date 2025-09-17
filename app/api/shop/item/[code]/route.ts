export const runtime = "nodejs"; export const dynamic = "force-dynamic";
import { NextResponse } from "next/server"; import prisma from "@/lib/prisma";

export async function GET(_req: Request, ctx: { params: { code: string }}) {
  const item = await prisma.shopItem.findUnique({
    where: { code: ctx.params.code },
    include: { skus: true, bundles: { include: { sku: { include: { item: true } } } } },
  });
  if (!item || !item.visible) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json({ item });
}
