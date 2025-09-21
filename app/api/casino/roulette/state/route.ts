// app/api/casino/roulette/state/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { getState, ensureRoomLoop } from "@/services/roulette.service";
import { RouletteRoomCode } from "@prisma/client";

const Query = z.object({ room: z.nativeEnum(RouletteRoomCode) });

export async function GET(req: Request) {
  const url = new URL(req.url);
  const room = url.searchParams.get("room") as RouletteRoomCode | null;
  const parsed = Query.safeParse({ room });
  if (!parsed.success) return NextResponse.json({ error: "BAD_QUERY" }, { status: 400 });

  await ensureRoomLoop(parsed.data.room);
  const state = await getState(parsed.data.room);
  return NextResponse.json(state);
}
