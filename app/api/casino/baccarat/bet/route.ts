// app/api/casino/baccarat/bet/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyJWT } from "@/lib/jwt";
import { phaseAt, roundSeqAt, taipeiDayStartUTC } from "@/lib/baccarat";

const ALLOWED = new Set([
  "PLAYER","BANKER","TIE","PLAYER_PAIR","BANKER_PAIR","ANY_PAIR","PERFECT_PAIR"
]);

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ error: "未登入" }, { status: 401 });
    const payload = await verifyJWT(token);
    const userId = String(payload.sub);

    const roomCode = (req.nextUrl.searchParams.get("room") || "R60").toUpperCase();
    const room = await prisma.room.findUnique({ where: { code: roomCode as any } });
    if (!room) return NextResponse.json({ error: "房間不存在" }, { status: 404 });

    const { side, amount } = await req.json();
    if (!ALLOWED.has(side)) return NextResponse.json({ error: "無效注項" }, { status: 400 });

    const amt = Number(amount);
    if (!Number.isInteger(amt) || amt <= 0) return NextResponse.json({ error: "無效金額" }, { status: 400 });

    const now = new Date();
    const { phase } = phaseAt(now, room.durationSeconds);
    if (phase !== "BETTING") return NextResponse.json({ error: "非下注時間" }, { status: 400 });

    const day = taipeiDayStartUTC(now);
    const roundSeq = roundSeqAt(now, room.durationSeconds);

    // TODO: balance 檢查與扣款（之後接銀行）
    await prisma.bet.create({
      data: {
        userId,
        roomId: room.id,
        day,
        roundSeq,
        side,
        amount: amt
      }
    });

    return NextResponse.json({ ok: true, room: room.code, day, roundSeq });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Bad Request" }, { status: 400 });
  }
}
