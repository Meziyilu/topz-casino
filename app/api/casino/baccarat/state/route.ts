// app/api/casino/baccarat/state/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyJWT } from "@/lib/jwt";
import {
  phaseAt,
  roundSeqAt,
  dealBy,
  taipeiDayStartUTC,
  recentSeqs,
} from "@/lib/baccarat";

export const runtime = "nodejs";

type Phase = "BETTING" | "REVEAL" | "SETTLED";

export async function GET(req: NextRequest) {
  try {
    // 1) 取得房間
    const roomCode = (req.nextUrl.searchParams.get("room") || "R60").toUpperCase();
    const room = await prisma.room.findUnique({ where: { code: roomCode as any } });
    if (!room) return NextResponse.json({ error: "房間不存在" }, { status: 404 });

    // 2) 計算當日 / 局序 / 階段 / 倒數
    const now = new Date();
    const day = taipeiDayStartUTC(now);
    const roundSeq = roundSeqAt(now, room.durationSeconds);
    const { phase, secLeft } = phaseAt(now, room.durationSeconds);

    // 3) 嘗試取得使用者（選擇性）
    const token = req.cookies.get("token")?.value;
    let userId: string | null = null;
    if (token) {
      try {
        const payload = await verifyJWT(token);
        userId = String(payload.sub);
      } catch {
        // token 失效就當匿名
      }
    }

    // 4) 我的下注（使用 findMany + for..of，最穩）
    let myBets: Record<string, number> = {};
    if (userId) {
      const bets = await prisma.bet.findMany({
        where: { userId, roomId: room.id, day, roundSeq },
        select: { side: true, amount: true },
      });
      for (const b of bets) {
        const key = String(b.side);
        myBets[key] = (myBets[key] ?? 0) + b.amount;
      }
    }

    // 5) 若非下注期，給出本局結果（用決定性發牌）
    const result = phase === "BETTING" ? null : dealBy(room.code, day, roundSeq);

    // 6) 近 10 局（同房同日）→ 路子
    const rec = recentSeqs(10, roundSeq).map((seq) => {
      const d = dealBy(room.code, day, seq);
      return {
        roundSeq: seq,
        outcome: d.outcome,
        p: d.playerTotal,
        b: d.bankerTotal,
      };
    });

    // 7) 回傳
    return NextResponse.json({
      room: {
        code: room.code,
        name: room.name,
        durationSeconds: room.durationSeconds,
      },
      day,       // 當日（以台北切日的 UTC 時間）
      roundSeq,  // 當日局序（1 起算）
      phase,     // "BETTING" | "REVEAL" | "SETTLED"
      secLeft,   // 此階段剩餘秒數
      result,    // 非下注期才有牌面/結果
      myBets,    // 這局我的下注加總
      recent: rec, // 路子資料（近 10 局）
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Bad Request" },
      { status: 400 }
    );
  }
}
