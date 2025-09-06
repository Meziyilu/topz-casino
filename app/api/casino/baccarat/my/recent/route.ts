import { NextRequest, NextResponse } from "next/server";
import { getMyRecentBets } from "@/services/baccarat.service";
import { getUserFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await getUserFromRequest(req);
    if (!auth) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

    const items = await getMyRecentBets(auth.id);
    return NextResponse.json({ ok: true, items });
  } catch (e) {
    console.error("BACCARAT_MY_RECENT", e);
    return NextResponse.json({ ok: false, error: "INTERNAL" }, { status: 500 });
  }
}
