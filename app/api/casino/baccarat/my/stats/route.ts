// app/api/casino/baccarat/my/stats/route.ts
import { NextResponse } from "next/server";
import { getMyStats } from "@/services/baccarat.service";
import { getUserFromRequest } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await getUserFromRequest(req);
  if (!auth) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

  try {
    const stats = await getMyStats(auth.id);
    return NextResponse.json({ ok: true, stats });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? "STATS_FAIL") }, { status: 500 });
  }
}
