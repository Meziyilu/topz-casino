// app/api/casino/baccarat/my/recent/route.ts
import { NextResponse } from "next/server";
import { getMyRecentBets } from "@/services/baccarat.service";
import { getUserFromRequest } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await getUserFromRequest(req);
  if (!auth) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

  try {
    const bets = await getMyRecentBets(auth.id);
    return NextResponse.json({ ok: true, bets });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? "RECENT_FAIL") }, { status: 500 });
  }
}
