// app/api/casino/baccarat/round/current/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { RoomCode } from "@prisma/client";
import { getCurrentWithMyBets } from "@/services/baccarat.service";
import { getUserFromNextRequest } from "@/lib/auth"; // 請確認此函式存在

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const Schema = z.object({ room: z.nativeEnum(RoomCode) });
  const url = new URL(req.url);
  const parsed = Schema.safeParse({ room: url.searchParams.get("room") as unknown });
  if (!parsed.success) return NextResponse.json({ ok: false, error: "BAD_ROOM" }, { status: 400 });

  const user = await getUserFromNextRequest(req).catch(() => null);

  const round = await getCurrentWithMyBets(parsed.data.room, user?.id ?? null);
  return NextResponse.json({ ok: true, round });
}
