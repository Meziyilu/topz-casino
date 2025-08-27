import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyJWT } from "@/lib/jwt";
import { phaseAt, roundNumberAt, type RoomSec } from "@/lib/baccarat";

const ALLOWED = new Set(["PLAYER","BANKER","TIE","PLAYER_PAIR","BANKER_PAIR","ANY_PAIR","PERFECT_PAIR"]);

function parseRoomSec(req: NextRequest): RoomSec {
  const r = Number(new URL(req.url).searchParams.get("room") || "60");
  return (r === 30 || r === 60 || r === 90) ? r : 60;
}

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ error: "未登入" }, { status: 401 });
    const payload = await verifyJWT(token);
    const userId = String(payload.sub);

    const roomSec = parseRoomSec(req);
    const { side, amount } = await req.json();

    if (!ALLOWED.has(side)) return NextResponse.json({ error: "無效注項" }, { status: 400 });

    const amt = Number(amount);
    if (!Number.isInteger(amt) || amt <= 0) return NextResponse.json({ error: "無效金額" }, { status: 400 });

    const now = new Date();
    const { phase } = phaseAt(now, roomSec);
    if (phase !== "BETTING") return NextResponse.json({ error: "非下注時間" }, { status: 400 });

    const round = roundNumberAt(now, roomSec);

    await prisma.bet.create({ data: { userId, round, roomSec, side, amount: amt } });

    return NextResponse.json({ ok: true, round });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Bad Request" }, { status: 400 });
  }
}
