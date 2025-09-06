import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { RoomCode } from "@prisma/client";
import { getRoomInfo } from "@/services/baccarat.service";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  ctx: { params: { code: string } }
) {
  try {
    const schema = z.object({ code: z.nativeEnum(RoomCode) });
    const parsed = schema.safeParse({ code: ctx.params.code as any });
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "BAD_ROOM" }, { status: 400 });
    }

    const room = await getRoomInfo(parsed.data.code);
    return NextResponse.json({ ok: true, room });
  } catch (e) {
    console.error("BACCARAT_ROOM_INFO", e);
    return NextResponse.json({ ok: false, error: "INTERNAL" }, { status: 500 });
  }
}
