// app/api/bank/history/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getHistory } from "@/services/bank.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await getUserFromRequest(req);
    if (!auth?.id) return NextResponse.json({ ok: false }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor");
    const limit = Math.max(1, Math.min(50, Number(searchParams.get("limit") || 20)));

    const r = await getHistory(auth.id, cursor, limit);
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    console.error("BANK_HISTORY", e);
    return NextResponse.json({ ok: false, error: "INTERNAL" }, { status: 500 });
  }
}
