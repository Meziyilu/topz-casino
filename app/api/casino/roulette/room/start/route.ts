// app/api/casino/roulette/room/start/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureRoomLoop } from "@/services/roulette.service";
import { RouletteRoomCode } from "@prisma/client";

const Query = z.object({ room: z.nativeEnum(RouletteRoomCode) });

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = Query.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "BAD_BODY" }, { status: 400 });

  await ensureRoomLoop(parsed.data.room);
  return NextResponse.json({ ok: true });
}
