// app/api/bank/history/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { listLedgers } from "@/services/wallet.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await getUserFromRequest(req);
  if (!auth) return NextResponse.json({ ok: false }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? 20), 1), 100);
  const cursor = searchParams.get("cursor") ?? undefined;

  try {
    const { items, nextCursor } = await listLedgers(auth.id, { target: "BANK", limit, cursor });
    return NextResponse.json({ ok: true, items, nextCursor: nextCursor ?? null });
  } catch {
    return NextResponse.json({ ok: false, error: "HISTORY_FAIL" }, { status: 500 });
  }
}
