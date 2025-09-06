import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { RoomCode } from "@prisma/client";
import { getPublicRounds } from "@/services/baccarat.service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const schema = z.object({
      room: z.nativeEnum(RoomCode),
      limit: z.coerce.number().int().min(1).max(100).default(20),
      cursor: z.string().optional(),
    });

    const parsed = schema.safeParse({
      room: sp.get("room") as any,
      limit: sp.get("limit") ?? undefined,
      cursor: sp.get("cursor") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "BAD_QUERY" }, { status: 400 });
    }

    const { items, nextCursor } = await getPublicRounds(
      parsed.data.room,
      parsed.data.limit,
      parsed.data.cursor
    );
    return NextResponse.json({ ok: true, items, nextCursor });
  } catch (e) {
    console.error("BACCARAT_ROUNDS", e);
    return NextResponse.json({ ok: false, error: "INTERNAL" }, { status: 500 });
  }
}
