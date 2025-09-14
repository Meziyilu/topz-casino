import { NextResponse } from "next/server";
import { getPublicRounds } from "@/services/baccarat.service";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const room = (searchParams.get("room") || "R30") as "R30"|"R60"|"R90";
    const take = Number(searchParams.get("take") || 50);
    const items = await getPublicRounds(room, take);
    return NextResponse.json({ items });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "UNKNOWN_ERROR" }, { status: 500 });
  }
}
