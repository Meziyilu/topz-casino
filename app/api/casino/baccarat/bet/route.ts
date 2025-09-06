// app/api/casino/baccarat/bet/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { RoomCode, BetSide } from "@prisma/client";
import { getUserFromRequest } from "@/lib/auth";
import { placeBets, type BetInput } from "@/services/baccarat.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// --- Zod Schemas ---
const BetSchema = z.object({
  side: z.nativeEnum(BetSide),
  amount: z.number().int().positive(),
});

const BodySchema = z.object({
  room: z.nativeEnum(RoomCode),       // 關鍵：用 enum，而不是 string()
  roundId: z.string().min(1),
  bets: z.array(BetSchema).min(1).max(8),
});

export async function POST(req: NextRequest) {
  const auth = await getUserFromRequest(req);
  if (!auth) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "BAD_BODY", detail: parsed.error.flatten() }, { status: 400 });
  }

  const { room, roundId, bets } = parsed.data; // room 現在是 RoomCode 型別
  try {
    const { wallet, accepted } = await placeBets(
      auth.id,
      room as RoomCode,
      roundId,
      bets as BetInput[]
    );
    return NextResponse.json({ ok: true, wallet, accepted });
  } catch (e: any) {
    const msg = String(e?.message ?? "BET_FAIL");
    const status = msg.includes("PHASE") || msg.includes("ROUND") ? 409
                 : msg.includes("BALANCE") ? 402
                 : 400;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
