import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyJWT } from "@/lib/jwt";
import { phaseAt, roundNumberAt, nowTaipei } from "@/lib/baccarat";

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

    const { side, amount } = await req.json();
    if (!ALLOWED.has(side)) return NextResponse.json({ error: "無效注項" }, { status: 400 });

    const amt = Number(amount);
    if (!Number.isInteger(amt) || amt <= 0) return NextResponse.json({ error: "無效金額" }, { status: 400 });

    const date = nowTaipei();
    const { phase } = phaseAt(date);
    if (phase !== "BETTING") return NextResponse.json({ error: "非下注時間" }, { status: 400 });

    const round = roundNumberAt(date);

    // TODO: 之後接銀行餘額檢查 / 扣款；此處先記錄下注
    await prisma.bet.create({
      data: { userId, round, side, amount: amt }
    });

    return NextResponse.json({ ok: true, round });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Bad Request" }, { status: 400 });
  }
}
