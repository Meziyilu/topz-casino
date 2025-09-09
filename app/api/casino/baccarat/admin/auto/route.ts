// app/api/casino/baccarat/admin/auto/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { BetSide, RoomCode, RoundPhase } from "@prisma/client";

// 你 service 裡定義的靜態房間秒數
const ROOM_SECONDS: Record<RoomCode, number> = {
  R30: 30, R60: 60, R90: 90,
};

// --- 小工具：校驗 Cron 金鑰 ---
function assertCronAuth(req: NextRequest) {
  const key = req.headers.get("x-cron-key");
  const ok = key && process.env.CRON_SECRET && key === process.env.CRON_SECRET;
  if (!ok) throw new Error("UNAUTHORIZED_CRON");
}

// --- 小工具：算點 / 隨牌（seed 用 roundId，確保重現） ---
type SimpleCard = { r: number; s: number }; // r:1~13, s:0~3
type Outcome = "PLAYER" | "BANKER" | "TIE";

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

  // 第三張（簡化版，但符合常見節奏）
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

  // 牌面旗標（對子/完美/任一對/超6）
  const sameRank = (a?: SimpleCard, b?: SimpleCard) => !!(a && b && a.r === b.r);
  const sameSuit = (a?: SimpleCard, b?: SimpleCard) => !!(a && b && a.s === b.s);
  const playerPair = sameRank(P[0], P[1]);
  const bankerPair = sameRank(B[0], B[1]);
  const perfectPair = (playerPair && sameSuit(P[0], P[1])) || (bankerPair && sameSuit(B[0], B[1]));
  const anyPair = playerPair || bankerPair;
  const super6 = outcome === "BANKER" && bPts === 6;

  return {
    outcome, pPts, bPts,
    flags: { playerPair, bankerPair, perfectPair, anyPair, super6 },
  };
}

// --- 賠率（可依你規則調整；此處：莊 1:1 不抽水，超6另算） ---
const ODDS: Record<BetSide, number> = {
  PLAYER: 1,
  BANKER: 1, // 常見是 0.95，這裡先 1（你要抽水再改）
  TIE: 8,
  PLAYER_PAIR: 11,
  BANKER_PAIR: 11,
  ANY_PAIR: 5,
  PERFECT_PAIR: 25,
  BANKER_SUPER_SIX: 12,
};

// --- 主流程：每個房間自動跑 ---
async function autoForRoom(room: RoomCode) {
  const seconds = ROOM_SECONDS[room] ?? 60;
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    // 取最新一局
    const cur = await tx.round.findFirst({
      where: { room },
      orderBy: { startedAt: "desc" },
    });

    // 沒局 → 開局
    if (!cur) {
      await tx.round.create({
        data: { room, phase: "BETTING", startedAt: now },
      });
      return;
    }

    // 依 phase 處理
    if (cur.phase === "BETTING") {
      const endAt = new Date(cur.startedAt.getTime() + seconds * 1000);
      if (now >= endAt) {
        // 結束下注 → 直接結算（也可中間插 REVEALING 幾秒）
        const sim = dealBaccarat(cur.id);

        // 寫入 outcome/結束
        await tx.round.update({
          where: { id: cur.id },
          data: { phase: "SETTLED", outcome: sim.outcome, endedAt: now },
        });

        // 取下注
        const bets = await tx.bet.findMany({ where: { roundId: cur.id } });

        // 聚合派彩（含主注 & 各種對子/超6）
        const userPayout: Record<string, number> = {};
        const userRefund: Record<string, number> = {}; // TIE 時退主注

        for (const b of bets) {
          const side = b.side as BetSide;

          // 主注三門
          if (side === "PLAYER" || side === "BANKER" || side === "TIE") {
            if (sim.outcome === "TIE") {
              // 平局：退主注（閒/莊）本金
              if (side === "PLAYER" || side === "BANKER") {
                userRefund[b.userId] = (userRefund[b.userId] ?? 0) + b.amount;
              }
              if (side === "TIE") {
                userPayout[b.userId] = (userPayout[b.userId] ?? 0) + Math.floor(b.amount * ODDS.TIE);
              }
            } else {
              const hit =
                (sim.outcome === "PLAYER" && side === "PLAYER") ||
                (sim.outcome === "BANKER" && side === "BANKER");
              if (hit) {
                userPayout[b.userId] = (userPayout[b.userId] ?? 0) + Math.floor(b.amount * ODDS[side]);
              }
            }
            continue;
          }

          // 旁注
          if (side === "PLAYER_PAIR" && sim.flags.playerPair) {
            userPayout[b.userId] = (userPayout[b.userId] ?? 0) + Math.floor(b.amount * ODDS.PLAYER_PAIR);
          }
          if (side === "BANKER_PAIR" && sim.flags.bankerPair) {
            userPayout[b.userId] = (userPayout[b.userId] ?? 0) + Math.floor(b.amount * ODDS.BANKER_PAIR);
          }
          if (side === "ANY_PAIR" && sim.flags.anyPair) {
            userPayout[b.userId] = (userPayout[b.userId] ?? 0) + Math.floor(b.amount * ODDS.ANY_PAIR);
          }
          if (side === "PERFECT_PAIR" && sim.flags.perfectPair) {
            userPayout[b.userId] = (userPayout[b.userId] ?? 0) + Math.floor(b.amount * ODDS.PERFECT_PAIR);
          }
          if (side === "BANKER_SUPER_SIX" && sim.flags.super6) {
            userPayout[b.userId] = (userPayout[b.userId] ?? 0) + Math.floor(b.amount * ODDS.BANKER_SUPER_SIX);
          }
        }

        // 寫錢包 & 帳本（派彩）
        for (const [uid, inc] of Object.entries(userPayout)) {
          if (inc > 0) {
            await tx.user.update({ where: { id: uid }, data: { balance: { increment: inc } } });
            await tx.ledger.create({
              data: { userId: uid, type: "PAYOUT", target: "WALLET", amount: inc },
            });
          }
        }
        // 退主注（TIE）
        for (const [uid, inc] of Object.entries(userRefund)) {
          if (inc > 0) {
            await tx.user.update({ where: { id: uid }, data: { balance: { increment: inc } } });
            await tx.ledger.create({
             data: { userId: uid, type: "PAYOUT", target: "WALLET", amount: inc },
            });
          }
        }

        // 直接開下一局
        await tx.round.create({
          data: { room, phase: "BETTING", startedAt: new Date() },
        });
      }
      return;
    }

    // 若是已結算 → 確保下一局存在（避免卡住）
    if (cur.phase === "SETTLED") {
      const newer = await tx.round.findFirst({
        where: { room, startedAt: { gt: cur.startedAt } },
        orderBy: { startedAt: "desc" },
      });
      if (!newer) {
        await tx.round.create({
          data: { room, phase: "BETTING", startedAt: now },
        });
      }
      return;
    }

    // 若是 REVEALING（你如果保留中場動畫可來這處理）
    if (cur.phase === "REVEALING") {
      // 這版直接略過（我們上面在 BETTING 到點就一次做完結算）
      return;
    }
  });
}

export async function POST(req: NextRequest) {
  try {
    assertCronAuth(req);

    // 跑三個房間
    for (const room of ["R30", "R60", "R90"] as RoomCode[]) {
      await autoForRoom(room);
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const msg = e?.message || "SERVER_ERROR";
    const code = msg === "UNAUTHORIZED_CRON" ? 401 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status: code });
  }
}
