// app/api/casino/baccarat/my-bets/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { RoomCode, BetSide } from "@prisma/client";
import { getUserFromRequest } from "@/lib/auth";
import { getCurrentWithMyBets } from "@/services/baccarat.service";

export const dynamic = "force-dynamic";

const Q = z.object({
  room: z
    .string()
    .transform((s) => s.toUpperCase())
    .pipe(z.enum(["R30", "R60", "R90"] as const)),
});

export async function GET(req: NextRequest) {
  try {
    // 1) 解析查詢
    const url = new URL(req.url);
    const parsed = Q.safeParse({ room: url.searchParams.get("room") ?? "" });
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "BAD_ROOM" }, { status: 400 });
    }
    const room = parsed.data.room as RoomCode;

    // 2) 需要登入（拿我的下注）
    const auth = await getUserFromRequest(req);
    if (!auth?.id) {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    // 3) 從同一個 service 取「當前局 + 我的下注」
    const current = await getCurrentWithMyBets(room, auth.id);

    // 容錯：如果 service 回的是「彙總物件」，我轉成 items 陣列；
    //       如果已經是 items 陣列，直接回傳。
    let items: { side: BetSide; amount: number }[] = [];

    if (Array.isArray(current?.myBets)) {
      items = (current!.myBets as any[]).map((b: any) => ({
        side: b.side as BetSide,
        amount: Number(b.amount ?? 0),
      }));
    } else if (current?.myBets && typeof current.myBets === "object") {
      for (const k of Object.keys(current.myBets)) {
        const amt = Number((current.myBets as any)[k] ?? 0);
        if (amt > 0) items.push({ side: k as BetSide, amount: amt });
      }
    }

    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message ?? "MY_BETS_FAIL") },
      { status: 500 }
    );
  }
}
