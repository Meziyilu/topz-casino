import { NextResponse } from "next/server";
import { getMyBets } from "@/services/baccarat.service";

function getUserId(req: Request) {
  return req.headers.get("x-user-id") || "demo-user";
}

export async function GET(req: Request) {
  try {
    const userId = getUserId(req);
    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit") || 10);
    const items = await getMyBets(userId, limit);
    return NextResponse.json({ items });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "UNKNOWN_ERROR" }, { status: 500 });
  }
}
