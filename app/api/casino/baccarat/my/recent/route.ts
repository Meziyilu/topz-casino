// app/api/casino/baccarat/my/recent/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getMyRecentBets } from "@/services/baccarat.service";

export async function GET(req: NextRequest) {
  const auth = await getUserFromRequest(req);
  if (!auth) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

  const items = await getMyRecentBets(auth.id);
  return NextResponse.json({ ok: true, items });
}
