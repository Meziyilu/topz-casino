import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!requireAdmin(req)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  // extend with admin actions if needed (force settle, reload config, etc.)
  return NextResponse.json({ ok: true });
}
