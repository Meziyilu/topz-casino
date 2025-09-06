// app/api/casino/baccarat/bet/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { BetSide, RoomCode } from "@prisma/client";
import { getUserFromRequest } from "@/lib/auth";
import { placeBets } from "services/baccarat.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BetItem = z.object({ side: z.nativeEnum(BetSide), amount: z.number().int().positive() });
const BodySchema = z.object({ room: z.nativeEnum(RoomCode), roundId: z.string().min(1), bets: z.array(BetItem).min(1) });

export async function POST(req: NextRequest) {
  const auth = await getUserFromRequest(req);
  if (!auth?.id) return NextResponse.json({ ok: false }, { status: 401 });

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "BAD_BODY" }, { status: 400 });

  try {
    const { wallet, accepted } = await placeBets(auth.id, parsed.data.room, parsed.data.roundId, parsed.data.bets);
    return NextResponse.json({ ok: true, wallet, accepted });
  } catch (e: any) {
    const msg = String(e?.message ?? "BET_FAIL");
    const map = msg === "NO_FUNDS" ? 400 : msg === "NOT_BETTING" ? 409 : 400;
    return NextResponse.json({ ok: false, error: msg }, { status: map });
  }
}
