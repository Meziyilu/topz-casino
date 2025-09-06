// app/api/casino/baccarat/history/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getRecentHistoryDTO } from "@/services/baccarat.service";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const roomParam = String(searchParams.get("room") || "R60").toUpperCase() as any;
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || 10)));

    const recent = await getRecentHistoryDTO(roomParam, limit);
    return NextResponse.json({ items: recent });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "HISTORY_FAIL" }, { status: 400 });
  }
}
