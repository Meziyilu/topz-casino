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
    const limit  = parseInt(searchParams.get("limit") || "20", 10);

    const data = await getHistory(auth.id, cursor, Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 100) : 20);
    return NextResponse.json({ ok: true, ...data });
  } catch (e) {
    console.error("BANK_HISTORY", e);
    return NextResponse.json({ ok: false, error: "INTERNAL" }, { status: 500 });
  }
}
