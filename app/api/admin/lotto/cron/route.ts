// app/api/admin/lotto/cron/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyJWTFromRequest } from "@/lib/authz";
import {
  DEFAULT_LOTTO_CONFIG,
  LOTTO_CONFIG_KEY,
  type LottoConfig,
  pick6of49,
  isOdd,
  isBig,
  perBallAttr,
  ODDS,
} from "@/lib/lotto";
import type { Prisma } from "@prisma/client";

/** 統一：no-store JSON 回應 */
function noStoreJson<T extends object>(payload: T, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

/** 僅允許 POST（cron 觸發） */
function verifyMethod(req: Request) {
  if (req.method !== "POST") throw new Error("METHOD_NOT_ALLOWED");
}

/** Admin 驗證 */
async function requireAdmin(req: Request) {
  const t = await verifyJWTFromRequest(req);
  if (!t || !t.isAdmin) throw new Error("FORBIDDEN");
  return t;
}

/** 讀取彩券設定 */
async function readConfig(): Promise<LottoConfig> {
  const row = await prisma.gameConfig.findUnique({ where: { key: LOTTO_CONFIG_KEY } });
  if (!row) return DEFAULT_LOTTO_CONFIG;
  // row.value 是 JSON：以 DEFAULT 覆蓋成完整 config
  return { ...DEFAULT_LOTTO_CONFIG, ...(row.value as Partial<LottoConfig>) };
}

/** 取得下一期代碼 */
async function nextRoundCode(): Promise<number> {
  const last = await prisma.lottoRound.findFirst({
    orderBy: [{ code: "desc" }],
    select: { code: true },
  });
  return last ? last.code + 1 : 1;
}

/** 型別安全：SPECIAL/BALL_ATTR 賠率取值 */
function getSpecialOdd(kind: "ODD" | "EVEN" | "BIG" | "SMALL"): number {
  return ODDS.SPECIAL[kind];
}
function getBallAttrOdd(kind: "ODD" | "EVEN" | "BIG" | "SMALL"): number {
  return ODDS.BALL_ATTR[kind];
}

type CronOk =
  | { ok: true; action: "OPEN"; round: { id: string; code: number; drawAt: string; status: string } }
  | { ok: true; action: "LOCK"; round: { id: string; code: number; drawAt: string; status: string } }
  | {
      ok: true;
      action: "DRAW";
      round: { id: string; code: number; status: string; numbers: number[]; special: number };
    }
  | {
      ok: true;
      action: "SETTLE+OPEN";
      round: { id: string; code: number; status: string; jackpot: number };
      next: { id: string; code: number; drawAt: string; status: string };
      paidOut: number;
    }
  | { ok: true; action: "NOOP" };

type CronErr =
  | { ok: false; error: "METHOD_NOT_ALLOWED" | "FORBIDDEN" | "SERVER_ERROR" };

export async function POST(req: Request) {
  try {
    verifyMethod(req);
    await requireAdmin(req); // 若要開放 Render Cron，這行可改成允許匿名（你自行決定）

    const cfg = await readConfig();
    const now = new Date();

    // 1) 沒有 OPEN → 直接開新期
    const open = await prisma.lottoRound.findFirst({
      where: { status: "OPEN" },
      orderBy: [{ drawAt: "asc" }],
      select: { id: true, code: true, drawAt: true, status: true },
    });

    if (!open) {
      const code = await nextRoundCode();
      const drawAt = new Date(Date.now() + cfg.drawIntervalSec * 1000);
      const created = await prisma.lottoRound.create({
        data: { code, drawAt, status: "OPEN", numbers: [] },
        select: { id: true, code: true, drawAt: true, status: true },
      });
      return noStoreJson<CronOk>({
        ok: true,
        action: "OPEN",
        round: { ...created, drawAt: created.drawAt.toISOString() },
      });
    }

    // 2) 若 OPEN 到封盤時間 → 轉 LOCKED，並把 drawAt 改成動畫結束時間
    if (open.drawAt <= now) {
      const locked = await prisma.lottoRound.update({
        where: { id: open.id },
        data: {
          status: "LOCKED",
          drawAt: new Date(Date.now() + cfg.animationSec * 1000),
        },
        select: { id: true, code: true, drawAt: true, status: true },
      });
      return noStoreJson<CronOk>({
        ok: true,
        action: "LOCK",
        round: { ...locked, drawAt: locked.drawAt.toISOString() },
      });
    }

    // 3) 有 LOCKED 且動畫到點 → DRAW（開出號碼）
    const locked = await prisma.lottoRound.findFirst({
      where: { status: "LOCKED", drawAt: { lte: now } },
      orderBy: [{ code: "asc" }],
      select: { id: true, code: true },
    });

    if (locked) {
      const { numbers, special } = pick6of49();
      const drawn = await prisma.lottoRound.update({
        where: { id: locked.id },
        data: { status: "DRAWN", numbers, special },
        select: { id: true, code: true, status: true, numbers: true, special: true },
      });
      return noStoreJson<CronOk>({
        ok: true,
        action: "DRAW",
        round: {
          id: drawn.id,
          code: drawn.code,
          status: drawn.status,
          numbers: drawn.numbers ?? [],
          special: drawn.special!,
        },
      });
    }

    // 4) 有 DRAWN → 立刻結算（PAID），並 OPEN 下一期
    const drawn = await prisma.lottoRound.findFirst({
      where: { status: "DRAWN" },
      orderBy: [{ code: "asc" }],
      select: { id: true, code: true, numbers: true, special: true },
    });

    if (drawn) {
      const winNums = drawn.numbers ?? [];
      const sp = drawn.special!;
      const bets = await prisma.lottoBet.findMany({
        where: { roundId: drawn.id, status: { in: ["PENDING"] } },
        select: {
          id: true,
          userId: true,
          kind: true,
          picks: true,
          amount: true,
          ballIndex: true,
          attr: true,
        },
      });

      const BATCH = 200;
      let totalJackpot = 0;

      for (let i = 0; i < bets.length; i += BATCH) {
        const slice = bets.slice(i, i + BATCH);

        await prisma.$transaction(async (tx) => {
          for (const b of slice) {
            let payout = 0;
            let matched = 0;
            let hitSpecial = false;
            let status: "WON" | "LOST" = "LOST";

            if (b.kind === "PICKS") {
              const picks = [...(b.picks ?? [])].sort((a, c) => a - c);
              matched = picks.filter((n) => winNums.includes(n)).length;
              const oddTable: Record<number, number> = { 3: 5, 4: 50, 5: 1_000, 6: 50_000 };
              const odd = oddTable[matched] ?? 0;
              if (odd > 0) {
                payout = Math.floor(b.amount * odd);
                status = "WON";
              }
            } else if (
              b.kind === "SPECIAL_ODD" ||
              b.kind === "SPECIAL_EVEN" ||
              b.kind === "SPECIAL_BIG" ||
              b.kind === "SPECIAL_SMALL"
            ) {
              const ok =
                (b.kind === "SPECIAL_ODD" && isOdd(sp)) ||
                (b.kind === "SPECIAL_EVEN" && !isOdd(sp)) ||
                (b.kind === "SPECIAL_BIG" && isBig(sp)) ||
                (b.kind === "SPECIAL_SMALL" && !isBig(sp));
              if (ok) {
                const key: "ODD" | "EVEN" | "BIG" | "SMALL" =
                  b.kind === "SPECIAL_ODD" ? "ODD" :
                  b.kind === "SPECIAL_EVEN" ? "EVEN" :
                  b.kind === "SPECIAL_BIG" ? "BIG" : "SMALL";
                const odd = getSpecialOdd(key);
                payout = Math.floor(b.amount * odd);
                status = "WON";
                hitSpecial = true;
              }
            } else if (b.kind === "BALL_ATTR") {
              const idx = (b.ballIndex ?? 0) - 1;
              if (idx >= 0 && idx < winNums.length && b.attr) {
                const attrs = perBallAttr(winNums[idx]); // { BIG/SMALL/ODD/EVEN: boolean }
                const key = String(b.attr) as keyof typeof attrs; // 已受限於 schema 的四鍵
                if (attrs[key]) {
                  const odd = getBallAttrOdd(key as "BIG" | "SMALL" | "ODD" | "EVEN");
                  payout = Math.floor(b.amount * odd);
                  status = "WON";
                }
              }
            }

            // 更新注單結果
            await tx.lottoBet.update({
              where: { id: b.id },
              data: { status, payout, matched, hitSpecial },
            });

            // 派彩 → 直接在交易內查與更新餘額，並寫入對應 ledger
            if (payout > 0) {
              const user = await tx.user.update({
                where: { id: b.userId },
                data: { balance: { increment: payout } },
                select: { balance: true, bankBalance: true },
              });

              const meta: Prisma.InputJsonValue = {
                roundId: drawn.id,
                roundCode: drawn.code,
                betId: b.id,
                kind: b.kind,
                amount: b.amount,
                matched,
                hitSpecial,
              };

              await tx.ledger.create({
                data: {
                  userId: b.userId,
                  type: "PAYOUT",
                  target: "WALLET",
                  delta: payout,
                  balanceAfter: user.balance,
                  bankAfter: user.bankBalance,
                  memo: `Lotto payout for round ${drawn.code}`,
                  fromTarget: null,
                  toTarget: "WALLET",
                  amount: payout,
                  fee: 0,
                  transferGroupId: null,
                  peerUserId: null,
                  meta,
                },
              });

              totalJackpot += payout;
            }
          }
        });
      }

      // 把 WON → PAID
      await prisma.lottoBet.updateMany({
        where: { roundId: drawn.id, status: "WON" },
        data: { status: "PAID" },
      });

      // 回寫本期結算數據
      const settled = await prisma.lottoRound.update({
        where: { id: drawn.id },
        data: { status: "SETTLED", jackpot: totalJackpot },
        select: { id: true, code: true, status: true, jackpot: true },
      });

      // 立刻開下一期（下注時間 = cfg.drawIntervalSec）
      const nextCode = await nextRoundCode();
      const nextDrawAt = new Date(Date.now() + cfg.drawIntervalSec * 1000);
      const opened = await prisma.lottoRound.create({
        data: { code: nextCode, drawAt: nextDrawAt, status: "OPEN", numbers: [] },
        select: { id: true, code: true, drawAt: true, status: true },
      });

      return noStoreJson<CronOk>({
        ok: true,
        action: "SETTLE+OPEN",
        round: { ...settled },
        next: { ...opened, drawAt: opened.drawAt.toISOString() },
        paidOut: totalJackpot,
      });
    }

    // 5) 沒事可做
    return noStoreJson<CronOk>({ ok: true, action: "NOOP" });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "METHOD_NOT_ALLOWED") {
        return noStoreJson<CronErr>({ ok: false, error: "METHOD_NOT_ALLOWED" }, 405);
      }
      if (err.message === "FORBIDDEN") {
        return noStoreJson<CronErr>({ ok: false, error: "FORBIDDEN" }, 403);
      }
    }
    return noStoreJson<CronErr>({ ok: false, error: "SERVER_ERROR" }, 500);
  }
}
