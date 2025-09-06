// app/api/casino/baccarat/bet/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { RoomCode } from "@prisma/client";
import { placeBets, type BetInput } from "@/services/baccarat.service";
import { getUserFromRequest } from "@/lib/auth";

const BetSchema = z.object({
  room: z.nativeEnum(RoomCode),
  roundId: z.string().min(1),
  bets: z.array(
    z.object({
      side: z.enum([
        "PLAYER", "BANKER", "TIE",
        "PLAYER_PAIR", "BANKER_PAIR",
        "ANY_PAIR", "PERFECT_PAIR", "BANKER_SUPER_SIX"
      ]),
      amount: z.number().int().positive()
    })
  ).min(1)
});

export async function POST(req: NextRequest) {
  const auth = await getUserFromRequest(req);
  if (!auth) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = BetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "BAD_BODY" }, { status: 400 });
  }

  try {
    const { wallet, accepted } = await placeBets(
      auth.id,
      parsed.data.room,            // ✅ 這裡就是 RoomCode，不會再是 string
      parsed.data.roundId,
      parsed.data.bets as BetInput[]
    );
    return NextResponse.json({ ok: true, wallet, accepted });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? "BET_FAIL") }, { status: 400 });
  }
}
