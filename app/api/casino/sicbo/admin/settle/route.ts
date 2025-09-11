// app/api/casino/sicbo/admin/settle/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { revealAndSettle } from "@/services/sicbo.service";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const roundId = body.roundId as string;
  if (!roundId) return NextResponse.json({ error: "MISSING_ROUND_ID" }, { status: 400 });

  const settled = await revealAndSettle(roundId);
  return NextResponse.json({
    ok: true,
    roundId: settled.id,
    dice: settled.dice,
    phase: settled.phase,
    endedAt: settled.endedAt,
  });
}
