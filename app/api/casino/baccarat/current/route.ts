import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { RoomCode } from "@prisma/client";
import { getCurrentWithMyBets } from "@/services/baccarat.service";
import { getUserFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await getUserFromRequest(req);
    if (!auth) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

    const sp = req.nextUrl.searchParams;
    const schema = z.object({ room: z.nativeEnum(RoomCode) });
    const parsed = schema.safeParse({ room: sp.get("room") as any });
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "BAD_ROOM" }, { status: 400 });
    }

    const data = await getCurrentWithMyBets(auth.id, parsed.data.room);
    return NextResponse.json({ ok: true, ...data });
  } catch (e) {
    console.error("BACCARAT_CURRENT", e);
    return NextResponse.json({ ok: false, error: "INTERNAL" }, { status: 500 });
  }
}
