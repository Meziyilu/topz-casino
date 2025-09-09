import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import type { BetSide, RoomCode } from "@prisma/client";

export const dynamic = "force-dynamic";

const Q = z.object({
  room: z.string().transform(s => s.toUpperCase()).pipe(z.enum(["R30","R60","R90"] as const)),
  reveal: z.coerce.number().min(2).max(15).default(5), // 動畫等待秒數
});

// ===== 可重現發牌（seed=roundId） =====
function rng(seedStr: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedStr.length; i++) { h ^= seedStr.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => {
    h += 0x6D2B79F5;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
type C = { r: number; s: number };
const draw = (rnd: () => number): C => ({ r: Math.floor(rnd() * 13) + 1, s: Math.floor(rnd() * 4) });
const pval = (r: number) => (r >= 10 ? 0 : r === 1 ? 1 : r);
const sameRank = (a?: C, b?: C) => !!(a && b && a.r === b.r);
const sameSuit = (a?: C, b?: C) => !!(a && b && a.s === b.s);

function deal(seed: string) {
  const rnd = rng(seed);
  const P: C[] = [draw(rnd), draw(rnd)];
  const B: C[] = [draw(rnd), draw(rnd)];
  const p2 = (pval(P[0].r) + pval(P[1].r)) % 10;
  const b2 = (pval(B[0].r) + pval(B[1].r)) % 10;
  let p3: C | undefined; let b3: C | undefined;

  // 標準規則（簡化：已足夠測試）
  if (p2 <= 5) p3 = draw(rnd);
  const pPts = (p2 + (p3 ? pval(p3.r) : 0)) % 10;

  if (!p3) { if (b2 <= 5) b3 = draw(rnd); }
  else {
    if (b2 <= 2) b3 = draw(rnd);
    else if (b2 <= 6) b3 = draw(rnd); // 近似規則，夠測試派彩
  }
  const bPts = (b2 + (b3 ? pval(b3.r) : 0)) % 10;

  const outcome = pPts === bPts ? "TIE" : pPts > bPts ? "PLAYER" : "BANKER";

  const flags = {
    playerPair: sameRank(P[0], P[1]),
    bankerPair: sameRank(B[0], B[1]),
    perfectPair: (sameRank(P[0],P[1]) && sameSuit(P[0],P[1])) || (sameRank(B[0],B[1]) && sameSuit(B[0],B[1])),
    anyPair: sameRank(P[0],P[1]) || sameRank(B[0],B[1]),
    super6: outcome === "BANKER" && bPts === 6,
  };

  return {
    outcome: outcome as "PLAYER" | "BANKER" | "TIE",
    pPts, bPts,
    flags,
    cards: { player: [P[0], P[1], p3].filter(Boolean) as C[], banker: [B[0], B[1], b3].filter(Boolean) as C[] },
  };
}

const ODDS: Record<BetSide, number> = {
  PLAYER: 1, BANKER: 1, TIE: 8,
  PLAYER_PAIR: 11, BANKER_PAIR: 11, ANY_PAIR: 5, PERFECT_PAIR: 25, BANKER_SUPER_SIX: 12,
};

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const parsed = Q.safeParse({ room: searchParams.get("room"), reveal: searchParams.get("reveal") ?? undefined });
    if (!parsed.success) return NextResponse.json({ error: "BAD_QUERY" }, { status: 400 });
    const { room, reveal } = parsed.data;

    // 取最近一局
    const cur = await prisma.round.findFirst({
      where: { room: room as RoomCode },
      orderBy: { startedAt: "desc" },
      select: { id: true, phase: true, outcome: true, startedAt: true },
    });
    if (!cur) return NextResponse.json({ error: "NO_ROUND" }, { status: 404 });
    if (cur.phase === "SETTLED") return NextResponse.json({ error: "ALREADY_SETTLED", roundId: cur.id }, { status: 409 });

    // 先標記 REVEALING（前端可馬上播放翻牌）
    if (cur.phase !== "REVEALING") {
      await prisma.round.update({ where: { id: cur.id }, data: { phase: "REVEALING" } });
    }

    // 模擬開牌時間（等待動畫）
    await new Promise(res => setTimeout(res, reveal * 1000));

    // 發牌＋判定
    const sim = deal(cur.id);
    const allBets = await prisma.bet.findMany({ where: { roundId: cur.id } });

    // 聚合每位玩家的派彩（含 TIE 退注）
    const userDelta: Record<string, number> = {};
    for (const b of allBets) {
      let inc = 0;

      if (b.side === "PLAYER" || b.side === "BANKER") {
        if (sim.outcome === "TIE") {
          inc += b.amount;                     // 退本金（用 PAYOUT 記正數）
        } else if ((sim.outcome === "PLAYER" && b.side === "PLAYER") || (sim.outcome === "BANKER" && b.side === "BANKER")) {
          inc += Math.floor(b.amount * ODDS[b.side]);
        }
      } else if (b.side === "TIE" && sim.outcome === "TIE") {
        inc += Math.floor(b.amount * ODDS.TIE);
      } else if (b.side === "PLAYER_PAIR" && sim.flags.playerPair) {
        inc += Math.floor(b.amount * ODDS.PLAYER_PAIR);
      } else if (b.side === "BANKER_PAIR" && sim.flags.bankerPair) {
        inc += Math.floor(b.amount * ODDS.BANKER_PAIR);
      } else if (b.side === "ANY_PAIR" && sim.flags.anyPair) {
        inc += Math.floor(b.amount * ODDS.ANY_PAIR);
      } else if (b.side === "PERFECT_PAIR" && sim.flags.perfectPair) {
        inc += Math.floor(b.amount * ODDS.PERFECT_PAIR);
      } else if (b.side === "BANKER_SUPER_SIX" && sim.flags.super6) {
        inc += Math.floor(b.amount * ODDS.BANKER_SUPER_SIX);
      }

      if (inc > 0) userDelta[b.userId] = (userDelta[b.userId] ?? 0) + inc;
    }

    // 交易：結算 → 入帳（全部用 PAYOUT）
    await prisma.$transaction(async (tx) => {
      await tx.round.update({
        where: { id: cur.id },
        data: { phase: "SETTLED", outcome: sim.outcome, endedAt: new Date() },
      });

      for (const [uid, inc] of Object.entries(userDelta)) {
        await tx.user.update({ where: { id: uid }, data: { balance: { increment: inc } } });
        await tx.ledger.create({
          data: { userId: uid, type: "PAYOUT", target: "WALLET", amount: inc },
        });
      }
    });

    return NextResponse.json({
      ok: true,
      roundId: cur.id,
      outcome: sim.outcome,
      points: { p: sim.pPts, b: sim.bPts },
      flags: sim.flags,
    });
  } catch (e) {
    console.error("[admin/settle]", e);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
