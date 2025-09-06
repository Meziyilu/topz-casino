// app/api/casino/baccarat/round/current/route.ts
import { NextResponse } from "next/server";
import { getCurrentWithMyBets } from "@/services/baccarat.service";
import { z } from "zod";
import { getUserFromRequest } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const schema = z.object({ room: z.string() });
  const parsed = schema.safeParse({ room: url.searchParams.get("room") });
  if (!parsed.success) return NextResponse.json({ ok: false, error: "BAD_ROOM" }, { status: 400 });

  const user = await getUserFromRequest(req).catch(() => null);

  try {
    const round = await getCurrentWithMyBets(parsed.data.room, user?.id ?? null);
    return NextResponse.json({ ok: true, round });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? "ROUND_FAIL") }, { status: 500 });
  }
}
