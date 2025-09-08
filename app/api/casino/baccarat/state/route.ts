// app/api/casino/baccarat/state/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { BetSide, RoomCode } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getOptionalUserId } from "@/lib/auth";
import { getRoomInfo, getCurrentWithMyBets } from "@/services/baccarat.service";

export const dynamic = "force-dynamic";

/** Query 參數驗證 */
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
    // 1) 解析房間
    const url = new URL(req.url);
    const parsed = Q.safeParse({ room: url.searchParams.get("room") ?? "" });
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "BAD_ROOM" }, { status: 400 });
    }
    const room = parsed.data.room as RoomCode;

    // 2) 取得登入者（可為 null）
    const userId = await getOptionalUserId(req);

    // 3) 房間靜態資訊（注意：service 用 secondsPerRound）
    const roomInfo = await getRoomInfo(room);
    const durationSeconds = Number((roomInfo as any)?.secondsPerRound ?? 60);
    const roomName = (roomInfo as any)?.name ?? room;

    // 4) 目前回合 + 我的下注（service 版）
    const current = await getCurrentWithMyBets(room, userId); // 可能為 null（尚未有任何 round）

    // === 4.1 取得回合細節：牌面/點數（若 schema 有欄位就會帶出；沒有則維持 undefined / 0） ===
    let cards: { player: Card[]; banker: Card[] } | undefined = undefined;
    let p = 0;
    let b = 0;

    if (current?.id && (current.phase === "REVEALING" || current.phase === "SETTLED")) {
      // 若你在 Round 直接存了欄位（建議：Json）
      const r = await prisma.round.findUnique({
        where: { id: current.id },
        // 你可以把下面 select 改為實際欄位；若沒有也不會壞
        select: {
          // 假設以下欄位存在（若不存在，TS 會報紅，但執行期不影響；你也可把 as any 移掉 select）
          // @ts-ignore
          cardsPlayer: true,
          // @ts-ignore
          cardsBanker: true,
          // @ts-ignore
          pointP: true,
          // @ts-ignore
          pointB: true,
        } as any,
      });

      // 若 round 有資料就帶出
      // @ts-ignore
      if (r?.cardsPlayer && r?.cardsBanker) {
        // @ts-ignore
        cards = { player: r.cardsPlayer as Card[], banker: r.cardsBanker as Card[] };
        // @ts-ignore
        p = Number(r.pointP ?? 0);
        // @ts-ignore
        b = Number(r.pointB ?? 0);
      } else {
        // 如果你是存在子表（RoundDetail），請打開這段
        // const det = await prisma.roundDetail.findUnique({ where: { roundId: current.id }});
        // if (det) {
        //   cards = { player: (det.playerCards as any[]) ?? [], banker: (det.bankerCards as any[]) ?? [] };
        //   p = Number(det.p ?? 0);
        //   b = Number(det.b ?? 0);
        // }
      }
    }

    // 5) 倒數計算：BETTING 期才顯示
    let secLeft = 0;
    if (current?.phase === "BETTING") {
      const endsAt = current.endsAt
        ? new Date(current.endsAt)
        : new Date(new Date(current.startedAt).getTime() + durationSeconds * 1000);
      secLeft = Math.max(0, Math.ceil((endsAt.getTime() - Date.now()) / 1000));
    }

    // 6) 我的錢包餘額（未登入則為 null）
    let balance: number | null = null;
    if (userId) {
      const me = await prisma.user.findUnique({ where: { id: userId }, select: { balance: true } });
      balance = me?.balance ?? 0;
    }

    // 7) myBets 陣列 → 彙總
    const myAgg: Partial<Record<BetSide, number>> = {};
    if (current?.myBets?.length) {
      for (const it of current.myBets) {
        myAgg[it.side] = (myAgg[it.side] ?? 0) + (it.amount ?? 0);
      }
    }

    // 8) recent：service 只有 id/outcome，先補零 p/b、roundSeq（未有欄位先給 0）
    const recent =
      current?.recent?.map((r) => ({
        roundSeq: 0, // 若之後在 round 表加入序號欄位可改真值
        outcome: (r.outcome ?? null) as Exclude<Outcome, null> | null,
        p: 0,
        b: 0,
      })) ?? [];

    // 9) result：service 只有 outcome，點數從上面取；沒有就 0
    const result =
      current?.outcome
        ? ({
            outcome: current.outcome as Exclude<Outcome, null>,
            p,
            b,
          } as const)
        : null;

    // 10) 輸出
    return NextResponse.json({
      ok: true,
      room: { code: room, name: roomName, durationSeconds },
      day: new Date().toISOString().slice(0, 10), // YYYY-MM-DD（UTC 切日；若要台北可換成 tz 版）
      roundId: current?.id ?? null,
      roundSeq: 0, // 之後若有欄位再改真值
      phase: (current?.phase ?? "BETTING") as "BETTING" | "REVEALING" | "SETTLED",
      secLeft,
      result,
      cards,        // 若無欄位則為 undefined；前端會顯示骨架
      myBets: myAgg,
      balance,
      recent,
      // status: 你的 PublicRoom 沒有 closed 欄位，先不回；若日後有可回 'CLOSED'
    });
  } catch (e) {
    console.error("[state] error:", e);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
