// app/api/casino/baccarat/my/stats/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getMyStats } from "@/services/baccarat.service";

export async function GET(req: NextRequest) {
  const auth = await getUserFromRequest(req);
  if (!auth) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

  const stats = await getMyStats(auth.id);
  return NextResponse.json({ ok: true, stats });
}
