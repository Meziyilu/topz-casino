// app/api/casino/baccarat/rooms/route.ts
import { NextResponse } from "next/server";
import { getRooms } from "@/services/baccarat.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rooms = await getRooms();
    return NextResponse.json({ ok: true, rooms });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? "ROOMS_FAIL") }, { status: 500 });
  }
}
