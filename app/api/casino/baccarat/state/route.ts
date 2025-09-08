// app/api/casino/baccarat/state/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { BetSide, RoomCode } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getOptionalUserId } from "@/lib/auth";
import {
  getRoomInfo,
  getCurrentWithMyBets,
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
    const url = new URL(req.url);
    const parsed = Q.safeParse({ room: url.searchParams.get("room") ?? "" });
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "BAD_ROOM" }, { status: 400 });
    }
    const room = parsed.data.room as RoomCode;

    // 取登入者（可為 null）
    const userId = await getOptionalUserId(req);

    // 房間靜態資訊（service 裡是 secondsPerRound）
    const roomInfo = await getRoomInfo(room);
    const durationSeconds = Number(roomInfo?.secondsPerRound ?? 60); // ← 修正重點
    const roomName = roomInfo?.name ?? room;

    // 目前回合 + 我的下注（service 版）
    const current = await getCurrentWithMyBets(room, userId);

    // 倒數：若 service 有 endsAt，用它；否則依 phase=BETTING 用 startedAt + secondsPerRound 推
    let secLeft = 0;
    if (current?.phase === "BETTING") {
      const endsAt = current.endsAt
        ? new Date(current.endsAt)
        : new Date(new Date(current.startedAt).getTime() + durationSeconds * 1000);
      secLeft = Math.max(0, Math.ceil((endsAt.getTime() - Date.now()) / 1000));
    }

    // 我的錢包餘額（可未登入）
    let balance: number | null = null;
    if (userId) {
      const me = await prisma.user.findUnique({ where: { id: userId }, select: { balance: true } });
      balance = me?.balance ?? 0;
    }

    // 把 service 的 myBets 陣列轉成彙總物件
    const myAgg: Partial<Record<BetSide, number>> = {};
    if (current?.myBets?.length) {
      for (const it of current.myBets) {
        myAgg[it.side] = (myAgg[it.side] ?? 0) + (it.amount ?? 0);
      }
    }

    // recent：service 只有 id/outcome；先把 p/b、roundSeq 補 0
    const recent =
      current?.recent?.map((r, i) => ({
        roundSeq: 0, // 你若之後在 round 表加欄位就改這裡
        outcome: (r.outcome ?? null) as Exclude<Outcome, null> | null,
        p: 0,
        b: 0,
      })) ?? [];

    // result：service 只有 outcome，沒有 p/b 點數，先補 0
    const result =
      current?.outcome
        ? ({
            outcome: current.outcome as Exclude<Outcome, null>,
            p: 0,
            b: 0,
          } as const)
        : null;

    return NextResponse.json({
      ok: true,
      room: { code: room, name: roomName, durationSeconds },
      day: new Date().toISOString().slice(0, 10), // YYYY-MM-DD
      roundId: current?.id ?? null,
      roundSeq: 0, // 之後若有欄位再回真值
      phase: (current?.phase ?? "BETTING") as "BETTING" | "REVEALING" | "SETTLED",
      secLeft,
      result,
      // cards: 可等你有開牌資料時再補
      myBets: myAgg,
      balance,
      recent,
      // status: 你的 PublicRoom 沒有 closed，就先不回
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
