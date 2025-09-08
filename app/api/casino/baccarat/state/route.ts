// app/api/casino/baccarat/state/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { BetSide, RoomCode } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getOptionalUserId } from "@/lib/auth";
import { getRoomInfo, getCurrentWithMyBets } from "@/services/baccarat.service";

export const dynamic = "force-dynamic";

/** --------- Query 解析 --------- */
const Q = z.object({
  room: z
    .string()
    .transform((s) => s.toUpperCase())
    .pipe(z.enum(["R30", "R60", "R90"] as const)),
});

type Outcome = "PLAYER" | "BANKER" | "TIE";
type SimpleCard = { r: number; s: number }; // r:1~13, s:0~3

/** --------- 可重現的發牌器（用 roundId 作為種子） --------- */
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
const draw = (rand: () => number): SimpleCard => ({ r: Math.floor(rand() * 13) + 1, s: Math.floor(rand() * 4) });
const point = (r: number) => (r >= 10 ? 0 : r === 1 ? 1 : r); // A=1, 10/J/Q/K=0

function dealBaccarat(seed: string) {
  const rand = rng(seed);
  const P: SimpleCard[] = [draw(rand), draw(rand)];
  const B: SimpleCard[] = [draw(rand), draw(rand)];

  const p2 = (point(P[0].r) + point(P[1].r)) % 10;
  const b2 = (point(B[0].r) + point(B[1].r)) % 10;

  let p3: SimpleCard | undefined;
  let b3: SimpleCard | undefined;

  // 簡化的第三張規則（足夠前端動畫與測試派彩）
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
      player: [P[0], P[1], p3].filter(Boolean) as SimpleCard[],
      banker: [B[0], B[1], b3].filter(Boolean) as SimpleCard[],
    },
  };
}

/** --------- API 主體 --------- */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const parsed = Q.safeParse({ room: url.searchParams.get("room") ?? "" });
    if (!parsed.success) return NextResponse.json({ ok: false, error: "BAD_ROOM" }, { status: 400 });
    const room = parsed.data.room as RoomCode;

    // 可未登入
    const userId = await getOptionalUserId(req);

    // 房間靜態資訊（services 定義的是 secondsPerRound）
    const roomInfo = await getRoomInfo(room);
    const durationSeconds = Number(roomInfo?.secondsPerRound ?? 60);
    const roomName = roomInfo?.name ?? room;

    // 目前回合 + 我的下注（services）
    const current = await getCurrentWithMyBets(room, userId);

    // 倒數：BETTING 用 startedAt + secondsPerRound
    let secLeft = 0;
    if (current?.phase === "BETTING" && current?.startedAt) {
      const endsAt = current.endsAt
        ? new Date(current.endsAt)
        : new Date(new Date(current.startedAt).getTime() + durationSeconds * 1000);
      secLeft = Math.max(0, Math.ceil((endsAt.getTime() - Date.now()) / 1000));
    }

    // 錢包
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

    // 生成本局的可重現牌面與點數（僅 REVEALING/SETTLED 會曝光）
    let cards: { player: { rank: number; suit: number }[]; banker: { rank: number; suit: number }[] } | undefined;
    let pPts = 0;
    let bPts = 0;

    if (current?.id && (current.phase === "REVEALING" || current.phase === "SETTLED")) {
      const sim = dealBaccarat(current.id);
      pPts = sim.pPts;
      bPts = sim.bPts;
      cards = {
        player: sim.cards.player.map((c) => ({ rank: c.r, suit: c.s })),
        banker: sim.cards.banker.map((c) => ({ rank: c.r, suit: c.s })),
      };
    }

    // 當前結果（若 services 已寫 outcome 就用它；點數用模擬 p/b）
    const result =
      current?.outcome
        ? ({
            outcome: current.outcome as Outcome,
            p: pPts,
            b: bPts,
          } as const)
        : null;

    // recent（把 services 的最近 10 局用各自 id 模擬點數，純展示用）
    const recent =
      current?.recent?.map((r, idx) => {
        if (!r.id) return { roundSeq: 0, outcome: (r.outcome ?? null) as Outcome | null, p: 0, b: 0 };
        const sim = dealBaccarat(r.id);
        return {
          roundSeq: 0, // 你之後如果在 DB 加欄位就填真值
          outcome: (r.outcome ?? sim.outcome) as Outcome,
          p: sim.pPts,
          b: sim.bPts,
        };
      }) ?? [];

    return NextResponse.json({
      ok: true,
      room: { code: room, name: roomName, durationSeconds },
      day: new Date().toISOString().slice(0, 10), // YYYY-MM-DD
      roundId: current?.id ?? null,
      roundSeq: 0, // 之後若有欄位再帶真值
      phase: (current?.phase ?? "BETTING") as "BETTING" | "REVEALING" | "SETTLED",
      secLeft,
      result,        // { outcome, p, b } 或 null
      cards,         // 只有在 REVEALING/SETTLED 才會帶
      myBets: myAgg,
      balance,
      recent,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
