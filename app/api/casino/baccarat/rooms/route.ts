// app/api/casino/baccarat/rooms/route.ts
import { NextResponse } from "next/server";
import { getRooms } from "@/services/baccarat.service";

export const dynamic = "force-dynamic";

export async function GET() {
  const rooms = await getRooms();
  return NextResponse.json({ ok: true, rooms });
}
