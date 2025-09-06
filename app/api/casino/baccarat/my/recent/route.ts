// app/api/casino/baccarat/my/recent/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getMyRecentBets } from "@/services/baccarat.service";
import { getUserFromRequest } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await getUserFromRequest(req);
  if (!auth?.id) return NextResponse.json({ ok: false }, { status: 401 });

  const items = await getMyRecentBets(auth.id, 20);
  return NextResponse.json({ ok: true, items });
}
