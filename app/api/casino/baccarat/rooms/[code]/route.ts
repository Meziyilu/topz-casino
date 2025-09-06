// app/api/casino/baccarat/rooms/[code]/route.ts
import { NextResponse } from "next/server";
import { getRoomInfo } from "@/services/baccarat.service";
import { z } from "zod";
import { RoomCode } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_: Request, ctx: { params: { code: string } }) {
  const parsed = z.nativeEnum(RoomCode).safeParse(ctx.params.code as any);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "BAD_ROOM" }, { status: 400 });

  const room = await getRoomInfo(parsed.data);
  return NextResponse.json({ ok: true, room });
}
