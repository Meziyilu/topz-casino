// app/api/casino/baccarat/rounds/route.ts
import { NextResponse } from "next/server";
import { getPublicRounds } from "@/services/baccarat.service";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const schema = z.object({
    room: z.string(),
    limit: z.string().transform((s) => parseInt(s, 10)).optional(),
    cursor: z.string().optional(),
  });
  const parsed = schema.safeParse({
    room: url.searchParams.get("room"),
    limit: url.searchParams.get("limit") ?? "10",
    cursor: url.searchParams.get("cursor") ?? undefined,
  });
  if (!parsed.success) return NextResponse.json({ ok: false, error: "BAD_QUERY" }, { status: 400 });

  try {
    const rounds = await getPublicRounds(parsed.data.room, parsed.data.limit, parsed.data.cursor);
    return NextResponse.json({ ok: true, rounds });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? "ROUNDS_FAIL") }, { status: 500 });
  }
}
