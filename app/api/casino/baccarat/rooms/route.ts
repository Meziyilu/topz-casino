import { NextRequest, NextResponse } from "next/server";
import { getRooms } from "@/services/baccarat.service";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  try {
    const rooms = await getRooms();
    return NextResponse.json({ ok: true, rooms });
  } catch (e) {
    console.error("BACCARAT_ROOMS", e);
    return NextResponse.json({ ok: false, error: "INTERNAL" }, { status: 500 });
  }
}
