// app/api/casino/roulette/bet/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { placeBet } from "@/services/roulette.service";
import { RouletteRoomCode, RouletteBetKind } from "@prisma/client";
// import { getUserFromRequest } from "@/lib/auth"; // 你自己的登入/取得 user

const Body = z.object({
  room: z.nativeEnum(RouletteRoomCode),
  kind: z.nativeEnum(RouletteBetKind),
  amount: z.number().int().positive(),
  payload: z.any().optional(),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = Body.safeParse(json);
    if (!parsed.success) return NextResponse.json({ error: "BAD_BODY" }, { status: 400 });

    // const me = await getUserFromRequest(req);
    const me = { id: json.userId ?? "DEMO_USER" }; // 臨時：你替換成真正的驗證

    const out = await placeBet({
      userId: me.id,
      room: parsed.data.room,
      kind: parsed.data.kind,
      amount: parsed.data.amount,
      payload: parsed.data.payload,
    });
    return NextResponse.json({ ok: true, ...out });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "BET_FAIL" }, { status: 400 });
  }
}
