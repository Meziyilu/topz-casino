// app/api/casino/baccarat/round/current/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { RoomCode } from "@prisma/client";
import { getCurrentWithMyBets } from "@/services/baccarat.service";
import { getUserFromRequest } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 用 enum 做驗證，避免變回 string
const QuerySchema = z.object({
  room: z.nativeEnum(RoomCode),
});

export async function GET(req: NextRequest) {
  // 解析 query
  const { searchParams } = new URL(req.url);
  const parsed = QuerySchema.safeParse({ room: searchParams.get("room") });
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "BAD_ROOM" }, { status: 400 });
  }

  // 這裡一定要是 NextRequest，getUserFromRequest 才能讀 cookies
  const user = await getUserFromRequest(req).catch(() => null);

  try {
    const round = await getCurrentWithMyBets(parsed.data.room, user?.id ?? null);
    return NextResponse.json({ ok: true, round });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message ?? "ROUND_FETCH_FAIL") },
      { status: 500 }
    );
  }
}
