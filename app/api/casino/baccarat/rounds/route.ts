// app/api/casino/baccarat/rounds/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { RoomCode } from "@prisma/client";
import { getPublicRounds } from "@/services/baccarat.service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const Schema = z.object({
    room: z.nativeEnum(RoomCode),
    limit: z.coerce.number().int().min(1).max(50).optional(),
    cursor: z.string().optional(),
  });
  const parsed = Schema.safeParse({
    room: url.searchParams.get("room") as unknown,
    limit: url.searchParams.get("limit") ?? undefined,
    cursor: url.searchParams.get("cursor") ?? undefined,
  });
  if (!parsed.success) return NextResponse.json({ ok: false, error: "BAD_QUERY" }, { status: 400 });

  const { items, nextCursor } = await getPublicRounds(parsed.data.room, parsed.data.limit ?? 10, parsed.data.cursor ?? null);
  return NextResponse.json({ ok: true, items, nextCursor });
}
