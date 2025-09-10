// app/api/casino/baccarat/admin/settle/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { BetSide, RoomCode } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const Q = z.object({
  room: z.enum(["R30", "R60", "R90"] as const),
});

/** 與 state 同一套 RNG，確保前端/後端一致 */
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
const draw = (rand: () => number) => ({ r: Math.floor(rand() * 13) + 1, s: Math.floor(rand() * 4) });
const point = (r: number) => (r >= 10 ? 0 : r === 1 ? 1 : r);

function deal(seed: string) {
  const rand = rng(seed);
  const P = [draw(rand), draw(rand)];
  const B = [draw(rand), draw(rand)];

  const p2 = (point(P[0].r) + point(P[1].r)) % 10;
  const b2 = (point(B[0].r) + point(B[1].r)) % 10;

  let p3: any;
  let b3: any;

  if (p2 <= 5) p3 = draw(rand);
  const pPts = (p2 + (p3 ? point(p3.r) : 0)) % 10;

  if (!p3) {
    if (b2 <= 5) b3 = draw(rand);
  } else {
    if (b2 <= 2) b3 = draw(rand);
    else if (b2 <= 6 && rand() < 0.5) b3 = draw(rand);
  }
  const bPts = (b2 + (b3 ? point(b3.r) : 0)) % 10;

  const outcome: "PLAYER" | "BANKER" | "TIE" = pPts === bPts ? "TIE" : pPts > bPts ? "PLAYER" : "BANKER";

  // 側注旗標
  const sameRank = (a?: any, b?: any) => !!(a && b && a.r === b.r);
  const sameSuit = (a?: any, b?: any) => !!(a && b && a.s === b.s);
  const playerPair = sameRank(P[0], P[1]);
  const bankerPair = sameRank(B[0], B[1]);
  const perfectPair = (playerPair && sameSuit(P[0], P[1])) || (bankerPair && sameSuit(B[0], B[1]));
  const anyPair = playerPair || bankerPair;
  const bankerSix = outcome === "BANKER" && bPts === 6; // Super Six 條件

  return { outcome, pPts, bPts, flags: { playerPair, bankerPair, perfectPair, anyPair, bankerSix } };
}

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const parsed = Q.safeParse({ room: url.searchParams.get("room") ?? "" });
    if (!parsed.success) return NextResponse.json({ error: "BAD_ROOM" }, { status: 400 });
    const room = parsed.data.room as RoomCode;

    const round = await prisma.round.findFirst({
      where: { room },
      orderBy: { startedAt: "desc" },
    });
    if (!round) return NextResponse.json({ error: "ROUND_NOT_FOUND" }, { status: 404 });
    if (round.phase === "SETTLED")
      return NextResponse.json({ ok: true, already: true, roundId: round.id });

    // 模擬本局（與前端/State 一致）
    const sim = deal(round.id);

    // 取全部下注
    const bets = await prisma.bet.findMany({ where: { roundId: round.id } });

    // 賠率表（標準）
    const odds: Record<BetSide, number> = {
      PLAYER: 1,
      BANKER: 1,              // 但莊 6 點半賠，下面會特判
      TIE: 8,
      PLAYER_PAIR: 11,
      BANKER_PAIR: 11,
      ANY_PAIR: 5,
      PERFECT_PAIR: 25,
      BANKER_SUPER_SIX: 12,   // 只有「莊且 6 點」才中
    } as any;

    // 聚合派彩
    const userPayout: Record<string, number> = {};
    const userRefund: Record<string, number> = {}; // 和局退還閒/莊本金

    for (const b of bets) {
      // 主注
      if (b.side === "PLAYER" || b.side === "BANKER" || b.side === "TIE") {
        let prize = 0;
        if (b.side === "TIE" && sim.outcome === "TIE") {
          prize = b.amount * odds.TIE; // 8x（本金不退，直接得 8x，等價於 1 贏 8）
          // 閒/莊在和局退還本金
          // 這個退還動作要在整體回圈後「補」給押閒/莊的人
        } else if (b.side === "PLAYER" && sim.outcome === "PLAYER") {
          prize = b.amount * odds.PLAYER; // 1x
        } else if (b.side === "BANKER" && sim.outcome === "BANKER") {
          // 莊贏但 6 點 → 半賠（0.5x）
          const rate = sim.flags.bankerSix ? 0.5 : odds.BANKER;
          prize = Math.floor(b.amount * rate);
        }

        // 和局時退還閒/莊本金
        if (sim.outcome === "TIE" && (b.side === "PLAYER" || b.side === "BANKER")) {
          userRefund[b.userId] = (userRefund[b.userId] ?? 0) + b.amount;
        }

        if (prize > 0) {
          userPayout[b.userId] = (userPayout[b.userId] ?? 0) + prize + b.amount; // 派彩=獎金+本金（主注比照你期望：贏 100 回到 200）
        } else if (sim.outcome !== "TIE") {
          // 沒中且非和局：不退本金
        }
      } else {
        // 側注
        let win = false;
        if (b.side === "PLAYER_PAIR") win = sim.flags.playerPair;
        else if (b.side === "BANKER_PAIR") win = sim.flags.bankerPair;
        else if (b.side === "ANY_PAIR") win = sim.flags.anyPair;
        else if (b.side === "PERFECT_PAIR") win = sim.flags.perfectPair;
        else if (b.side === "BANKER_SUPER_SIX") win = sim.flags.bankerSix;

        if (win) {
          // 側注中獎「通常不退本金」，直接派賠率 * 本金（你若想 + 本金，改成 + b.amount）
          const prize = Math.floor(b.amount * odds[b.side]);
          if (prize > 0) userPayout[b.userId] = (userPayout[b.userId] ?? 0) + prize;
        }
      }
    }

    // 補上和局退還的本金（閒/莊）
    if (sim.outcome === "TIE") {
      for (const [uid, refund] of Object.entries(userRefund)) {
        userPayout[uid] = (userPayout[uid] ?? 0) + refund;
      }
    }

    // 寫 DB
    await prisma.$transaction(async (tx) => {
      await tx.round.update({
        where: { id: round.id },
        data: { phase: "SETTLED", outcome: sim.outcome },
      });

      for (const [uid, inc] of Object.entries(userPayout)) {
        if (inc > 0) {
          await tx.user.update({ where: { id: uid }, data: { balance: { increment: inc } } });
          await tx.ledger.create({
            data: { userId: uid, type: "PAYOUT", target: "WALLET", amount: inc },
          });
        }
      }
    });

    return NextResponse.json({
      ok: true,
      roundId: round.id,
      outcome: sim.outcome,
      p: sim.pPts,
      b: sim.bPts,
      flags: sim.flags,
    });
  } catch (e) {
    console.error("[admin/settle] error:", e);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
