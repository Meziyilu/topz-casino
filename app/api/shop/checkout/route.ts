export const runtime = "nodejs"; export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { performCheckout } from "@/services/shop.service";

export async function POST(req: NextRequest) {
  const auth = await getUserFromRequest(req).catch(()=>null);
  if (!auth?.userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const body = await req.json().catch(()=>null);
  const { skuId, qty = 1, idempotencyKey } = body || {};
  if (!skuId || !idempotencyKey) return NextResponse.json({ error: "BAD_BODY" }, { status: 400 });

  try {
    const p = await performCheckout({ userId: auth.userId, skuId, qty: Math.max(1, parseInt(qty)), idempotencyKey, vipTier: auth.user.vipTier });
    return NextResponse.json({ ok:true, purchaseId: p.id });
  } catch (e:any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 400 });
  }
}
