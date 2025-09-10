// app/api/casino/baccarat/state/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { BetSide, RoomCode, RoundPhase } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getOptionalUserId } from "@/lib/auth";
import { getRoomInfo, getCurrentWithMyBets } from "@/services/baccarat.service";

export const dynamic = "force-dynamic";

// ---- Query ----
const Q = z.object({
  room: z
    .string()
    .transform((s) => s.toUpperCase())
    .pipe(z.enum(["R30", "R60", "R90"] as const)),
});

type Outcome = "PLAYER" | "BANKER" | "TIE";

// ---- 可重現的發牌器（用 roundId 當種子）----
function rng(seedStr: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6D2B79F5;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const draw = (rand: () => number) => ({ r: Math.floor(rand() * 13) + 1, s: Math.floor(rand() * 4) }); // r:1~13, s:0~3
const point = (r: number) => (r >= 10 ? 0 : r === 1 ? 1 : r);

/** 回傳：outcome, pPts, bPts, cards(player/banker: [{rank,suit}])，含百家樂第三張規則（簡化但一致） */
function dealBaccarat(seed: string) {
  const rand = rng(seed);
  const P = [draw(rand), draw(rand)];
  const B = [draw(rand), draw(rand)];

  const p2 = (point(P[0].r) + point(P[1].r)) % 10;
  const b2 = (point(B[0].r) + point(B[1].r)) % 10;

  let p3: { r: number; s: number } | undefined;
  let b3: { r: number; s: number } | undefined;

  // 簡化第三張（足夠動畫與測試）
  if (p2 <= 5) p3 = draw(rand);
  const pPts = (p2 + (p3 ? point(p3.r) : 0)) % 10;

  if (!p3) {
    if (b2 <= 5) b3 = draw(rand);
  } else {
    if (b2 <= 2) b3 = draw(rand);
    else if (b2 <= 6 && rand() < 0.5) b3 = draw(rand);
  }
  const bPts = (b2 + (b3 ? point(b3.r) : 0)) % 10;

  const outcome: Outcome = pPts === bPts ? "TIE" : pPts > bPts ? "PLAYER" : "BANKER";

  return {
    outcome,
    pPts,
    bPts,
    cards: {
      player: [P[0], P[1], p3].filter(Boolean).map((c: any) => ({ rank: c.r, suit: c.s })),
      banker: [B[0], B[1], b3].filter(Boolean).map((c: any) => ({ rank: c.r, suit: c.s })),
    },
  };
}

/** 計算今日局序（同房間、同一天，按 startedAt 升冪） */
async function computeRoundSeqToday(room: RoomCode, roundId?: string | null) {
  if (!roundId) return 0;
  const now = new Date();
  const tzOffsetMin = now.getTimezoneOffset(); // 以伺服器時區為準
  const dayStart = new Date(now);
  dayStart.setHours(0, 0 - tzOffsetMin, 0, 0);
  const items = await prisma.round.findMany({
    where: {
      room,
      startedAt: { gte: new Date(dayStart.getTime() + tzOffsetMin * 60000) },
    },
    orderBy: { startedAt: "asc" },
    select: { id: true },
  });
  const idx = items.findIndex((r) => r.id === roundId);
  return idx >= 0 ? idx + 1 : 0;
}

/** 主 API */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const parsed = Q.safeParse({ room: url.searchParams.get("room") ?? "" });
    if (!parsed.success) return NextResponse.json({ ok: false, error: "BAD_ROOM" }, { status: 400 });
    const room = parsed.data.room as RoomCode;

    const userId = await getOptionalUserId(req);

    // 房間靜態資訊（secondsPerRound 來自 services）
    const roomInfo = await getRoomInfo(room);
    const durationSeconds = Number(roomInfo?.secondsPerRound ?? 60);
    const roomName = roomInfo?.name ?? room;

    // 當前回合 + 我的下注
    const current = await getCurrentWithMyBets(room, userId);

    // 倒數（BETTING：startedAt + secondsPerRound）
    let secLeft = 0;
    if (current?.phase === "BETTING" && current?.startedAt) {
      const endsAt = new Date(new Date(current.startedAt).getTime() + durationSeconds * 1000);
      secLeft = Math.max(0, Math.ceil((endsAt.getTime() - Date.now()) / 1000));
    }

    // 我的餘額
    let balance: number | null = null;
    if (userId) {
      const me = await prisma.user.findUnique({ where: { id: userId }, select: { balance: true } });
      balance = me?.balance ?? 0;
    }

    // 我的本局下注彙總
    const myAgg: Partial<Record<BetSide, number>> = {};
    if (current?.myBets?.length) {
      for (const it of current.myBets) {
        myAgg[it.side] = (myAgg[it.side] ?? 0) + (it.amount ?? 0);
      }
    }

    // 本局牌面/點數（只在 REVEALING / SETTLED）
    let cards:
      | { player: { rank: number; suit: number }[]; banker: { rank: number; suit: number }[] }
      | undefined;
    let pPts = 0;
    let bPts = 0;

    if (current?.id && (current.phase === "REVEALING" || current.phase === "SETTLED")) {
      const sim = dealBaccarat(current.id);
      pPts = sim.pPts;
      bPts = sim.bPts;
      cards = sim.cards;
    }

    // 結果：以 DB 的 outcome 優先；若無則帶 null（點數以模擬為主，純顯示）
    const result = current?.outcome
      ? ({
          outcome: current.outcome as Outcome,
          p: pPts,
          b: bPts,
        } as const)
      : null;

    // 今日局序（對齊大廳路子序號）
    const roundSeq = await computeRoundSeqToday(room, current?.id);

    // 近 20 局（對齊序號與點數；用每一局 id 做模擬）
    const last20 = await prisma.round.findMany({
      where: { room },
      orderBy: { startedAt: "desc" },
      take: 20,
      select: { id: true, startedAt: true, outcome: true },
    });
    // 重新以當天順序編號（升冪），前端 hover 顯示會對得上
    const todayAllAsc = await prisma.round.findMany({
      where: {
        room,
        startedAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
      orderBy: { startedAt: "asc" },
      select: { id: true },
    });
    const todayIndex = new Map(todayAllAsc.map((r, i) => [r.id, i + 1]));

    const recent = last20.map((r) => {
      const sim = dealBaccarat(r.id);
      return {
        roundSeq: todayIndex.get(r.id) ?? 0,
        outcome: (r.outcome ?? sim.outcome) as Outcome,
        p: sim.pPts,
        b: sim.bPts,
      };
    });

    return NextResponse.json({
      ok: true,
      room: { code: room, name: roomName, durationSeconds },
      day: new Date().toISOString().slice(0, 10),
      roundId: current?.id ?? null,
      roundSeq,
      phase: (current?.phase ?? "BETTING") as RoundPhase,
      secLeft,
      result,
      cards,
      myBets: myAgg,
      balance,
      recent,
    });
  } catch (e) {
    console.error("[state] error:", e);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
