import { NextResponse } from "next/server";
import { getRooms } from "@/services/baccarat.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const rooms = await getRooms();
  return NextResponse.json({ rooms });
}
