// app/api/casino/baccarat/admin/auto/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { BetSide, RoomCode, RoundPhase, LedgerType } from "@prisma/client";
import { getRoomInfo } from "@/services/baccarat.service";

// 簡單保護：要求 x-cron-key
function assertCronKey(req: NextRequest) {
  const key = req.headers.get("x-cron-key");
  const expect = process.env.CRON_SECRET || "";
  if (!expect || key !== expect) throw new Error("UNAUTHORIZED_CRON");
}

const REVEAL_SECONDS = 3; // 開牌動畫時間（秒）— 過了就派彩
type Outcome = "PLAYER" | "BANKER" | "TIE";

// 依 roundId 產生可重現的發牌結果（與你 /state 版一致）
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
const point = (r: number) => (r >= 10 ? 0 : r === 1 ? 1 : r);
const draw = (rand: () => number) => ({ r: Math.floor(rand() * 13) + 1, s: Math.floor(rand() * 4) });

function dealBaccarat(seed: string) {
  const rand = rng(seed);
  const P = [draw(rand), draw(rand)];
  const B = [draw(rand), draw(rand)];
  const p2 = (point(P[0].r) + point(P[1].r)) % 10;
  const b2 = (point(B[0].r) + point(B[1].r)) % 10;
  let p3: any | undefined;
  let b3: any | undefined;
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
  // 對子/完美對/任一對/超級六（派彩會用到）
  const sameRank = (a?: any, b?: any) => !!(a && b && a.r === b.r);
  const sameSuit = (a?: any, b?: any) => !!(a && b && a.s === b.s);
  const playerPair = sameRank(P[0], P[1]);
  const bankerPair = sameRank(B[0], B[1]);
  const perfectPair = (playerPair && sameSuit(P[0], P[1])) || (bankerPair && sameSuit(B[0], B[1]));
  const anyPair = playerPair || bankerPair;
  const super6 = outcome === "BANKER" && bPts === 6;

  return { outcome, pPts, bPts, flags: { playerPair, bankerPair, anyPair, perfectPair, super6 } };
}

// —— 單房 tick：把房間往下一狀態推進 ——
async function tickRoom(room: RoomCode) {
  const rc = await getRoomInfo(room); // 含 secondsPerRound
  const secPerRound = Number(rc.secondsPerRound || 60);
  const now = new Date();

  // 取最新一局
  const cur = await prisma.round.findFirst({
    where: { room },
    orderBy: { startedAt: "desc" },
  });

  // 沒有就開局
  if (!cur) {
    const r = await prisma.round.create({
      data: { room, phase: "BETTING", startedAt: now },
    });
    return { action: "OPEN", roundId: r.id, phase: r.phase };
  }

  // 已結算 → 開下一局
  if (cur.phase === "SETTLED") {
    const r = await prisma.round.create({
      data: { room, phase: "BETTING", startedAt: now },
    });
    return { action: "OPEN", roundId: r.id, phase: r.phase };
  }

  // BETTING：時間到了 → 進 REVEALING
  if (cur.phase === "BETTING") {
    const endsAt = new Date(cur.startedAt.getTime() + secPerRound * 1000);
    if (now >= endsAt) {
      const r = await prisma.round.update({
        where: { id: cur.id },
        data: { phase: "REVEALING", endedAt: now },
      });
      return { action: "TO_REVEALING", roundId: r.id, phase: r.phase };
    }
    return { action: "NONE", roundId: cur.id, phase: cur.phase };
  }

  // REVEALING：過 REVEAL_SECONDS → 結算 + 派彩
  if (cur.phase === "REVEALING") {
    const revealStart = cur.endedAt ?? cur.startedAt;
    const canSettleAt = new Date(revealStart.getTime() + REVEAL_SECONDS * 1000);
    if (now >= canSettleAt) {
      // 用 round id 發牌（可重現）
      const sim = dealBaccarat(cur.id);
      const outcome: Outcome = sim.outcome;

      // 贏率表（示意）— 你要抽水或 5% 抽水可自行調整
      const odds: Record<BetSide, number> = {
        PLAYER: 1,
        BANKER: 1,           // 沒做莊家 5 抽水
        TIE: 8,
        PLAYER_PAIR: sim.flags.playerPair ? 11 : 0,
        BANKER_PAIR: sim.flags.bankerPair ? 11 : 0,
        ANY_PAIR: sim.flags.anyPair ? 5 : 0,
        PERFECT_PAIR: sim.flags.perfectPair ? 25 : 0,
        BANKER_SUPER_SIX: sim.flags.super6 ? 12 : 0,
      };

      // 找出本局所有注單
      const bets = await prisma.bet.findMany({ where: { roundId: cur.id } });

      // 聚合：每人贏得金額
      const userPayout: Record<string, number> = {};
      for (const b of bets) {
        // 主注判定
        const winMain =
          (outcome === "PLAYER" && b.side === "PLAYER") ||
          (outcome === "BANKER" && b.side === "BANKER") ||
          (outcome === "TIE" && b.side === "TIE");
        // 旁注由 odds 是否 >0 來決定
        const hitSide = odds[b.side] > 0;

        const won = b.side === "PLAYER" || b.side === "BANKER" || b.side === "TIE" ? winMain : hitSide;
        const prize = won ? Math.floor(b.amount * odds[b.side]) : 0;
        if (prize > 0) {
          userPayout[b.userId] = (userPayout[b.userId] ?? 0) + prize;
        }
      }

      // 交易：更新回合 + 派彩 & 記帳（PAYOUT）
      await prisma.$transaction(async (tx) => {
        await tx.round.update({
          where: { id: cur.id },
          data: { phase: "SETTLED", outcome },
        });

        for (const [uid, inc] of Object.entries(userPayout)) {
          await tx.user.update({ where: { id: uid }, data: { balance: { increment: inc } } });
          await tx.ledger.create({
            data: { userId: uid, type: "PAYOUT" as LedgerType, target: "WALLET", amount: inc },
          });
        }
      });

      return { action: "SETTLED", roundId: cur.id, outcome };
    }
    return { action: "NONE", roundId: cur.id, phase: cur.phase };
  }

  return { action: "NONE", roundId: cur.id, phase: cur.phase };
}

export async function POST(req: NextRequest) {
  try {
    assertCronKey(req);

    const body = await req.json().catch(() => ({}));
    const room = (body?.room || "").toUpperCase() as RoomCode | "";
    const rooms: RoomCode[] = room && ["R30", "R60", "R90"].includes(room as any)
      ? [room as RoomCode]
      : (process.env.ROOM_LIST || "R30,R60,R90").split(",").map(s => s.trim() as RoomCode);

    const results = [];
    for (const r of rooms) {
      results.push(await tickRoom(r));
    }
    return NextResponse.json({ ok: true, results });
  } catch (e: any) {
    const msg = e?.message || "SERVER_ERROR";
    const code = msg === "UNAUTHORIZED_CRON" ? 401 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status: code });
  }
}
