// app/api/casino/baccarat/bet/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { BetSide, RoomCode } from "@prisma/client";
import { placeBets, BetInput } from "@/services/baccarat.service";
import { getUserFromNextRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

const Body = z.object({
  room: z.nativeEnum(RoomCode),
  roundId: z.string().min(10),
  bets: z.array(z.object({
    side: z.nativeEnum(BetSide),
    amount: z.number().int().positive(),
  })).min(1),
});

export async function POST(req: NextRequest) {
  const auth = await getUserFromNextRequest(req);
  if (!auth?.id) return NextResponse.json({ ok: false }, { status: 401 });

  const parsed = Body.safeParse(await req.json());
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
    const msg = String(e?.message ?? "BET_FAIL");
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
