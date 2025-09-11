import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(_req: NextRequest) {
  // Admin actions stub.
  // TODO: when your '@/lib/auth' exports `requireAdmin`, add it back here.
  return NextResponse.json({ ok: true, note: "Admin stub. Hook up requireAdmin when available." });
}
