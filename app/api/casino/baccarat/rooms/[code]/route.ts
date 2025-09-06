// app/api/casino/baccarat/rooms/[code]/route.ts
import { NextResponse } from "next/server";
import { getRoomInfo } from "@/services/baccarat.service";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_: Request, ctx: { params: { code: string } }) {
  const parsed = z.object({ code: z.string() }).safeParse(ctx.params);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "BAD_CODE" }, { status: 400 });
  }

  try {
    const info = await getRoomInfo(parsed.data.code);
    return NextResponse.json({ ok: true, info });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? "ROOM_INFO_FAIL") }, { status: 500 });
  }
}
