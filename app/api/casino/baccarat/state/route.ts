// app/api/casino/baccarat/state/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { RoomCode, BetSide } from "@prisma/client";
import { getOptionalUserId } from "@/lib/auth";
import {
  // 這些名稱請對上你 services 的實際 export（之前我們已經用過）
  getRoomInfo,
  getCurrentWithMyBets,
  getPublicRounds,
} from "@/services/baccarat.service";

export const dynamic = "force-dynamic";

const Q = z.object({
  room: z
    .string()
    .transform((s) => s.toUpperCase())
    .pipe(z.enum(["R30", "R60", "R90"] as const)),
});

type Outcome = "PLAYER" | "BANKER" | "TIE";
type Card = { rank?: number | string; value?: number | string; suit?: any; s?: any } | string;

export async function GET(req: NextRequest) {
  try {
    // 1) 解析查詢參數
    const url = new URL(req.url);
    const parsed = Q.safeParse({ room: url.searchParams.get("room") ?? "" });
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "BAD_ROOM" }, { status: 400 });
    }
    const room = parsed.data.room as RoomCode;

    // 2) 取可選使用者（未登入也可）
    const userId = await getOptionalUserId(req);

    // 3) 撈資料（用你現有的 services）
    //    - roomInfo: 房間名稱/秒數/是否關閉
    //    - current: 當前局狀態 + 我的下注彙總 + 餘額
    //    - recent: 近 20 局路子
    const [roomInfo, current, recentRaw] = await Promise.all([
      getRoomInfo(room),
      getCurrentWithMyBets(room, userId),
      getPublicRounds(room, 20, null),
    ]);

    // roomInfo 容錯
    const roomName = roomInfo?.name ?? String(room);
    const durationSeconds = Number(roomInfo?.durationSeconds ?? 60);
    const status: "CLOSED" | undefined = roomInfo?.closed ? "CLOSED" : undefined;

    // current 容錯（services 沒給就設預設）
    const roundId: string | null = current?.roundId ?? null;
    const roundSeq: number = Number(current?.roundSeq ?? 0);
    const phase: "BETTING" | "REVEALING" | "SETTLED" = (current?.phase as any) ?? "BETTING";
    const secLeft: number = Number(current?.secLeft ?? 0);
    const result:
      | null
      | { outcome: Outcome; p: number; b: number } = current?.result
      ? {
          outcome: current.result.outcome as Outcome,
          p: Number(current.result.p ?? 0),
          b: Number(current.result.b ?? 0),
        }
      : null;

    const cards:
      | { player: Card[]; banker: Card[] }
      | undefined = current?.cards
      ? {
          player: (current.cards.player ?? []) as Card[],
          banker: (current.cards.banker ?? []) as Card[],
        }
      : undefined;

    const myBets: Partial<Record<BetSide, number>> =
      (current?.myBets as any) ??
      {}; // 後端若傳陣列你也可以在 service 先彙總；這裡先容錯

    const balance: number | null = current?.balance ?? null;

    // recent: 近 20 局
    const recent =
      (recentRaw?.items ?? recentRaw ?? []).map((r: any) => ({
        roundSeq: Number(r.roundSeq ?? 0),
        outcome: (r.outcome || r.result || "TIE") as Outcome,
        p: Number(r.p ?? r.player ?? 0),
        b: Number(r.b ?? r.banker ?? 0),
      })) ?? [];

    // 4) 組合成前端要的 shape
    return NextResponse.json({
      ok: true,
      room: { code: room, name: roomName, durationSeconds },
      day: current?.day ?? current?.tzDay ?? current?.date ?? "", // 盡量對齊；不行就給空字串
      roundId,
      roundSeq,
      phase,
      secLeft,
      result,
      cards,
      myBets,
      balance,
      recent,
      status,
    });
  } catch (e: any) {
    // 防止回傳 HTML 造成前端 "Unexpected token '<'"
    return NextResponse.json(
      { ok: false, error: String(e?.message ?? "STATE_FAIL") },
      { status: 500 }
    );
  }
}
