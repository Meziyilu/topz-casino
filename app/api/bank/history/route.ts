// app/api/bank/history/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromRequest } from "@/lib/auth";
import { getHistory } from "@/services/bank.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Q = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const auth = await getUserFromRequest(req);
    if (!auth?.id) return NextResponse.json({ ok: false }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const parsed = Q.safeParse({
      cursor: searchParams.get("cursor") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });
    if (!parsed.success) return NextResponse.json({ ok: false, error: "BAD_QUERY" }, { status: 400 });

    const { items, nextCursor } = await getHistory(auth.id, parsed.data.cursor, parsed.data.limit ?? 20);
    return NextResponse.json({ ok: true, items, nextCursor });
  } catch (e) {
    console.error("BANK_HISTORY", e);
    return NextResponse.json({ ok: false, error: "INTERNAL" }, { status: 500 });
  }
}
