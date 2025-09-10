import { NextRequest, NextResponse } from "next/server";
import { getUserId, requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  if (!requireAdmin(userId)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  return NextResponse.json({ ok: true, note: "Admin actions reserved" });
}
