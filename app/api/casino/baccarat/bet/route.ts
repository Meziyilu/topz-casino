// app/api/casino/baccarat/bet/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromRequest } from "@/lib/auth";
import { placeBets, type BetInput } from "@/services/baccarat.service";

// ※ 在 App Router 建議明確指定 runtime/dynamic，避免 Edge 對 request 體解析問題
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ── Zod：嚴格要求 side 與 amount 都必填且合法 ──────────────────────────────
const RoomSchema = z.enum(["R30", "R60", "R90"]); // 對齊你的 Prisma enum RoomCode
const SideSchema = z.enum([
  "PLAYER",
  "BANKER",
  "TIE",
  "PLAYER_PAIR",
  "BANKER_PAIR",
  "ANY_PAIR",
  "PERFECT_PAIR",
  "BANKER_SUPER_SIX",
]);

const BetItemSchema = z.object({
  side: SideSchema,                  // 必填
  amount: z.number().int().positive() // 必填：正整數
});

const BodySchema = z.object({
  room: RoomSchema,
  roundId: z.string().min(1),
  bets: z.array(BetItemSchema).min(1)
});

export async function POST(req: NextRequest) {
  try {
    const auth = await getUserFromRequest(req);
    if (!auth?.id) {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    // 解析 body
    const json = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "BAD_BODY" }, { status: 400 });
    }

    // 透過 schema 已確保欄位完整，這裡轉成 BetInput[]
    const bets: BetInput[] = parsed.data.bets.map((b) => ({
      side: b.side,
      amount: b.amount,
    }));

    const { wallet, accepted } = await placeBets(
      auth.id,
      parsed.data.room,
      parsed.data.roundId,
      bets
    );

    return NextResponse.json({ ok: true, wallet, accepted });
  } catch (e: any) {
    const msg = String(e?.message ?? "BET_FAIL");
    // 針對常見錯誤回傳對應狀態碼（可依你的 placeBets 拋錯訊息微調）
    if (msg.includes("CLOSED") || msg.includes("NOT_BETTING")) {
      return NextResponse.json({ ok: false, error: "ROUND_CLOSED" }, { status: 409 });
    }
    if (msg.includes("INSUFFICIENT")) {
      return NextResponse.json({ ok: false, error: "INSUFFICIENT_BALANCE" }, { status: 400 });
    }
    if (msg.includes("LIMIT")) {
      return NextResponse.json({ ok: false, error: "LIMIT_EXCEEDED" }, { status: 400 });
    }
    console.error("BACCARAT_BET", e);
    return NextResponse.json({ ok: false, error: "BET_FAIL" }, { status: 500 });
  }
}
