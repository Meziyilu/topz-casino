// app/api/casino/baccarat/round/current/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { RoomCode } from "@prisma/client";
import { getCurrentWithMyBets } from "@/services/baccarat.service";
import { getUserFromRequest } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QuerySchema = z.object({
  room: z.nativeEnum(RoomCode), // 關鍵：enum，而非 string()
});

export async function GET(req: NextRequest) {
  // 解析 query
  const { searchParams } = new URL(req.url);
  const parsed = QuerySchema.safeParse({
    room: searchParams.get("room"),
  });
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "BAD_ROOM" }, { status: 400 });
  }

  // 這裡一定要用 NextRequest，才能取 cookies
  const user = await getUserFromRequest(req).catch(() => null);

  try {
    const round = await getCurrentWithMyBets(parsed.data.room, user?.id ?? null);
    return NextResponse.json({ ok: true, round });
  } catch (e: any) {
    const msg = String(e?.message ?? "ROUND_FETCH_FAIL");
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
