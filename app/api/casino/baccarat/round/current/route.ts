// app/api/casino/baccarat/round/current/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCurrentWithMyBets } from "@/services/baccarat.service";
import { getUserFromRequest } from "@/lib/auth";
import { z } from "zod";
import { RoomCode } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await getUserFromRequest(req);
  if (!auth?.id) return NextResponse.json({ ok: false }, { status: 401 });
  const parsed = z.nativeEnum(RoomCode).safeParse(req.nextUrl.searchParams.get("room") as any);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "BAD_ROOM" }, { status: 400 });

  const data = await getCurrentWithMyBets(auth.id, parsed.data);
  return NextResponse.json({ ok: true, ...data });
}
