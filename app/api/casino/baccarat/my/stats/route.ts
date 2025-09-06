import { NextRequest, NextResponse } from "next/server";
import { getMyStats } from "@/services/baccarat.service";
import { getUserFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await getUserFromRequest(req);
    if (!auth) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

    const stats = await getMyStats(auth.id);
    return NextResponse.json({ ok: true, stats });
  } catch (e) {
    console.error("BACCARAT_MY_STATS", e);
    return NextResponse.json({ ok: false, error: "INTERNAL" }, { status: 500 });
  }
}
