import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";
import { ensureRooms, getRoomConfig, getRoomState } from "@/lib/sicbo/room";
import type { RoomCode } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  const body = await req.json().catch(() => null) as any;
  const room = (body?.room || "R60") as RoomCode;
  const bets = Array.isArray(body?.bets) ? body.bets : [];

  await ensureRooms();
  const s = getRoomState(room as any);
  const cfg = getRoomConfig(room as any);
  if (!s || !cfg) return NextResponse.json({ error: "ROOM_NOT_READY" }, { status: 503 });
  if (s.phase !== "BETTING") return NextResponse.json({ error: "NOT_IN_BETTING" }, { status: 409 });

  const me = await prisma.user.findUnique({ where:{ id:userId }, select:{ balance:true }});
  if (!me) return NextResponse.json({ error:"USER_NOT_FOUND" },{status:404});

  // 驗證下注與 Transaction ...
  // (省略，邏輯和之前版本一致)
  return NextResponse.json({ ok:true });
}
