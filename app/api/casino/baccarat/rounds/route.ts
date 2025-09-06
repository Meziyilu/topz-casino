// app/api/casino/baccarat/rounds/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { RoomCode } from "@prisma/client";
import { getPublicRounds } from "@/services/baccarat.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const roomStr = req.nextUrl.searchParams.get("room");
  const limit = Math.max(1, Math.min(50, Number(req.nextUrl.searchParams.get("limit") ?? 30)));
  const cursor = req.nextUrl.searchParams.get("cursor") ?? undefined;
  const parsed = z.nativeEnum(RoomCode).safeParse(roomStr as any);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "BAD_ROOM" }, { status: 400 });

  const data = await getPublicRounds(parsed.data, limit, cursor);
  return NextResponse.json({ ok: true, ...data });
}
