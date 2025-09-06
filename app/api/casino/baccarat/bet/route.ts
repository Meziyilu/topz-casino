// app/api/casino/baccarat/bet/route.ts
import { NextResponse } from "next/server";
import { placeBets, BetInput } from "@/services/baccarat.service";
import { getUserFromRequest } from "@/lib/auth";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  room: z.string(),
  roundId: z.string(),
  bets: z.array(
    z.object({
      side: z.enum([
        "PLAYER",
        "BANKER",
        "TIE",
        "PLAYER_PAIR",
        "BANKER_PAIR",
        "ANY_PAIR",
        "PERFECT_PAIR",
        "BANKER_SUPER_SIX",
      ]),
      amount: z.number().int().positive(),
    })
  ),
});

export async function POST(req: Request) {
  const auth = await getUserFromRequest(req);
  if (!auth) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "BAD_BODY" }, { status: 400 });

  try {
    const { wallet, accepted } = await placeBets(
      auth.id,
      parsed.data.room,
      parsed.data.roundId,
      parsed.data.bets as BetInput[]
    );
    return NextResponse.json({ ok: true, wallet, accepted });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? "BET_FAIL") }, { status: 500 });
  }
}
