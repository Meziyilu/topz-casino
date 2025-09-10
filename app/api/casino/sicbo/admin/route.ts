import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!requireAdmin(req)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  // 可擴充：強制結算/關房/開房/調整設定...（依你管理台）
  return NextResponse.json({ ok: true });
}
