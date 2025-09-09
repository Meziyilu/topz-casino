import { NextRequest, NextResponse } from "next/server";
import { ROOMS, getConfig, setConfig } from "../_utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const room = (url.searchParams.get("room") || "").toUpperCase();
  if (!ROOMS.includes(room as any)) return NextResponse.json({ error: "BAD_ROOM" }, { status: 400 });
  return NextResponse.json({ ok: true, room, config: getConfig(room as any) });
}

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const room = (url.searchParams.get("room") || "").toUpperCase();
  if (!ROOMS.includes(room as any)) return NextResponse.json({ error: "BAD_ROOM" }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  const { betSeconds, revealSeconds } = body || {};
  const cfg = setConfig(room as any, Number(betSeconds), Number(revealSeconds));
  return NextResponse.json({ ok: true, room, config: cfg });
}
