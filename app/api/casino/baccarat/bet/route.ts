import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { RoomCode } from "@prisma/client";
import { placeBets, type BetInput } from "@/services/baccarat.service";
import { getUserFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

const BetSideSchema = z.enum([
  "PLAYER",
  "BANKER",
  "TIE",
  "PLAYER_PAIR",
  "BANKER_PAIR",
  "ANY_PAIR",
  "PERFECT_PAIR",
  "BANKER_SUPER_SIX",
]);

const BodySchema = z.object({
  room: z.nativeEnum(RoomCode),       // ★ 關鍵：轉成 Enum，不是 string
  roundId: z.string().min(1),
  bets: z
    .array(
      z.object({
        side: BetSideSchema,
        amount: z.number().int().positive(),
      })
    )
    .min(1),
});

export async function POST(req: NextRequest) {
  const auth = await getUserFromRequest(req);
  if (!auth) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "BAD_BODY" }, { status: 400 });
  }

  try {
    const { wallet, accepted } = await placeBets(
      auth.id,
      parsed.data.room,
      parsed.data.roundId,
      parsed.data.bets as BetInput[]
    );
    return NextResponse.json({ ok: true, wallet, accepted });
  } catch (e: any) {
    const msg = String(e?.message ?? "BET_FAIL");
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
