// app/api/casino/baccarat/rooms/[code]/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { RoomCode } from "@prisma/client";
import { getRoomInfo } from "@/services/baccarat.service";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: { code: string } }) {
  const Schema = z.object({ code: z.nativeEnum(RoomCode) });
  const parsed = Schema.safeParse({ code: params.code as unknown });
  if (!parsed.success) return NextResponse.json({ ok: false, error: "BAD_ROOM" }, { status: 400 });

  const data = await getRoomInfo(parsed.data.code);
  return NextResponse.json({ ok: true, room: data });
}
