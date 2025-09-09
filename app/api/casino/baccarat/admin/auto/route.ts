// app/api/casino/baccarat/admin/auto/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { BetSide, RoomCode, RoundPhase } from "@prisma/client";
import { getRoomInfo } from "@/services/baccarat.service";

export const dynamic = "force-dynamic";

// 你的房間清單
const ROOMS: RoomCode[] = ["R30", "R60", "R90"];

// —— 安全驗證（跟 Cron 一樣的密鑰）——
function assertCronAuth(req: NextRequest) {
  const secret = process.env.CRON_SECRET || "dev_secret";
  const key = req.headers.get("x-cron-key");
  if (!key || key !== secret) {
    throw Object.assign(new Error("UNAUTHORIZED"), { status: 401 });
  }
}

// ====== 簡易可重現發牌（用 roundId 當 seed；不寫入卡牌欄位） ======
type Outcome = "PLAYER" | "BANKER" | "TIE";
type SimpleCard = { r: number; s: number };
const point = (r: number) => (r >= 10 ? 0 : r === 1 ? 1 : r);

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

function dealBaccarat(seed: string) {
  const rand = rng(seed);
  const P: SimpleCard[] = [draw(rand), draw(rand)];
  const B: SimpleCard[] = [draw(rand), draw(rand)];

  const p2 = (point(P[0].r) + point(P[1].r)) % 10;
  const b2 = (point(B[0].r) + point(B[1].r)) % 10;

  let p3: SimpleCard | undefined;
  let b3: SimpleCard | undefined;

  // 符合大多數場館的第三張規則（簡化版，但可用於派彩旗標判定）
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

  // 對子 / 完美對 / 任一對 / 超級六（莊 6）
  const sameRank = (a?: SimpleCard, b?: SimpleCard) => !!(a && b && a.r === b.r);
  const sameSuit = (a?: SimpleCard, b?: SimpleCard) => !!(a && b && a.s === b.s);

  const playerPair = sameRank(P[0], P[1]);
  const bankerPair = sameRank(B[0], B[1]);
  const perfectPair = (playerPair && sameSuit(P[0], P[1])) || (bankerPair && sameSuit(B[0], B[1]));
  const anyPair = playerPair || bankerPair;
  const super6 = outcome === "BANKER" && bPts === 6;

  return {
    outcome, pPts, bPts,
    flags: { playerPair, bankerPair, perfectPair, anyPair, super6 }
  };
}

// ====== 主要流程（每個房間各自處理） ======
const REVEAL_SECONDS = 2; // 開牌顯示時間（秒）

async function runForRoom(room: RoomCode) {
  // 用 advisory lock 避免多實例同時處理同一房
  const LOCK_KEY = 60000 + (room === "R30" ? 30 : room === "R60" ? 60 : 90);
  await prisma.$executeRawUnsafe(`SELECT pg_advisory_lock(${LOCK_KEY});`);
  try {
    const info = await getRoomInfo(room);
    const secondsPerRound = Number(info.secondsPerRound ?? 60);

    // 取最新一局
    let round = await prisma.round.findFirst({
      where: { room },
      orderBy: { startedAt: "desc" },
    });

    // 沒有就立刻開第一局
    if (!round) {
      await prisma.round.create({
        data: { room, phase: "BETTING", startedAt: new Date() },
      });
      return { room, action: "OPEN_FIRST" as const };
    }

    const now = Date.now();

    if (round.phase === "BETTING") {
      const endTs = new Date(round.startedAt).getTime() + secondsPerRound * 1000;
      if (now >= endTs) {
        // 到點 → 先進 REVEALING 並決定 outcome
        const sim = dealBaccarat(round.id);
        round = await prisma.round.update({
          where: { id: round.id },
          data: { phase: "REVEALING", outcome: sim.outcome, endedAt: new Date() },
        });
        return { room, action: "TO_REVEAL", outcome: sim.outcome };
      }
      return { room, action: "BETTING" as const };
    }

    if (round.phase === "REVEALING") {
      const revealStart = round.endedAt ? new Date(round.endedAt).getTime() : new Date(round.startedAt).getTime();
      if (now >= revealStart + REVEAL_SECONDS * 1000) {
        // 要結算
        const sim = dealBaccarat(round.id);

        // 讀取全部下注
        const bets = await prisma.bet.findMany({
          where: { roundId: round.id },
          select: { userId: true, side: true, amount: true },
        });

        // 派彩係數（主注 + 邊注）
        const ODDS: Record<BetSide, number> = {
          PLAYER: 1,
          BANKER: 1,         // 但莊 6 只賠 0.5（下面另外處理）
          TIE: 8,
          PLAYER_PAIR: 11,
          BANKER_PAIR: 11,
          ANY_PAIR: 5,
          PERFECT_PAIR: 25,
          BANKER_SUPER_SIX: 12,
        };

        // 計算每位玩家派彩（含 TIE 退還主注，莊 6 半賠）
        const payoutByUser: Record<string, number> = {};
        for (const b of bets) {
          let won = false;
          let odds = 0;

          // 主注
          if (b.side === "PLAYER") {
            won = sim.outcome === "PLAYER";
            odds = ODDS.PLAYER;
          } else if (b.side === "BANKER") {
            won = sim.outcome === "BANKER";
            odds = sim.flags.super6 ? 0.5 : ODDS.BANKER; // 莊 6 半賠
          } else if (b.side === "TIE") {
            won = sim.outcome === "TIE";
            odds = ODDS.TIE;
          } else {
            // 邊注
            if (b.side === "PLAYER_PAIR") { won = sim.flags.playerPair; odds = ODDS.PLAYER_PAIR; }
            if (b.side === "BANKER_PAIR") { won = sim.flags.bankerPair; odds = ODDS.BANKER_PAIR; }
            if (b.side === "ANY_PAIR")    { won = sim.flags.anyPair;    odds = ODDS.ANY_PAIR; }
            if (b.side === "PERFECT_PAIR"){ won = sim.flags.perfectPair; odds = ODDS.PERFECT_PAIR; }
            if (b.side === "BANKER_SUPER_SIX"){ won = sim.flags.super6;  odds = ODDS.BANKER_SUPER_SIX; }
          }

          let credit = 0;
          if (won) credit += Math.floor(b.amount * odds);

          // TIE 時，主注的 PLAYER/BANKER 要退本金
          if (sim.outcome === "TIE" && (b.side === "PLAYER" || b.side === "BANKER")) {
            credit += b.amount; // 退回本金
          }

          if (credit > 0) {
            payoutByUser[b.userId] = (payoutByUser[b.userId] ?? 0) + credit;
          }
        }

        // 交易：標記 SETTLED + 派彩入錢包 + Ledger（全部記為 PAYOUT，避免造成未知型別）
        await prisma.$transaction(async (tx) => {
          await tx.round.update({
            where: { id: round!.id },
            data: { phase: "SETTLED", outcome: sim.outcome, endedAt: new Date() },
          });

          for (const [uid, inc] of Object.entries(payoutByUser)) {
            await tx.user.update({ where: { id: uid }, data: { balance: { increment: inc } } });
            await tx.ledger.create({
              data: { userId: uid, type: "PAYOUT", target: "WALLET", amount: inc },
            });
          }
        });

        return { room, action: "SETTLED", outcome: sim.outcome };
      }
      return { room, action: "REVEALING" as const };
    }

    if (round.phase === "SETTLED") {
      // 開下一局（若上一局結束超過 1 秒）
      const ended = round.endedAt?.getTime() ?? round.startedAt.getTime();
      if (now >= ended + 1000) {
        await prisma.round.create({
          data: { room, phase: "BETTING", startedAt: new Date() },
        });
        return { room, action: "OPEN_NEXT" as const };
      }
      return { room, action: "IDLE_AFTER_SETTLED" as const };
    }

    return { room, action: "UNKNOWN_PHASE", phase: round.phase as RoundPhase };
  } finally {
    await prisma.$executeRawUnsafe(`SELECT pg_advisory_unlock(${LOCK_KEY});`);
  }
}

export async function POST(req: NextRequest) {
  try {
    assertCronAuth(req);

    const results = [];
    for (const room of ROOMS) {
      const r = await runForRoom(room);
      results.push(r);
    }
    return NextResponse.json({ ok: true, results });
  } catch (err: any) {
    const status = err?.status ?? 500;
    return NextResponse.json({ ok: false, error: err?.message ?? "SERVER_ERROR" }, { status });
  }
}
