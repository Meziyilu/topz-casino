// app/api/casino/roulette/admin/settle/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { settleRound } from "@/services/roulette.service";

const Body = z.object({ roundId: z.string().min(1) });

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = Body.safeParse(json);
    if (!parsed.success) return NextResponse.json({ error: "BAD_BODY" }, { status: 400 });

    const out = await settleRound(parsed.data.roundId);
    return NextResponse.json({ ok: true, ...out });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "SETTLE_FAIL" }, { status: 400 });
  }
}
