// app/api/casino/baccarat/my/stats/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getMyStats } from "@/services/baccarat.service";
import { getUserFromRequest } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await getUserFromRequest(req);
  if (!auth?.id) return NextResponse.json({ ok: false }, { status: 401 });

  const data = await getMyStats(auth.id);
  return NextResponse.json({ ok: true, ...data });
}
