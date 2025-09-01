// app/api/admin/lotto/cron/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyRequest } from "@/lib/jwt";
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

const noStore = (payload: any, status = 200) =>
  NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
    },
  });

async function readConfig(): Promise<LottoConfig> {
  const row = await prisma.gameConfig.findUnique({ where: { key: LOTTO_CONFIG_KEY } });
  if (!row) return DEFAULT_LOTTO_CONFIG;
  return { ...DEFAULT_LOTTO_CONFIG, ...(row.value as Partial<LottoConfig>) };
}

async function nextRoundCode(): Promise<number> {
  const last = await prisma.lottoRound.findFirst({
    orderBy: [{ code: "desc" }],
    select: { code: true },
  });
  return last ? last.code + 1 : 1;
}

export async function POST(req: Request) {
  // 若要完全對外開放給 Render Cron，可改成不驗證；此處維持 admin 才能觸發
  const auth = verifyRequest(req);
  if (!auth?.isAdmin) return noStore({ error: "FORBIDDEN" }, 403);

  const cfg = await readConfig();
  const now = new Date();

  // 1) 沒有 OPEN → 直接開新期（drawAt = now + drawIntervalSec）
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
    return noStore({ ok: true, action: "OPEN", round: created });
  }

  // 2) 若 OPEN 到封盤時間 → 轉 LOCKED，並把 drawAt 改成「動畫結束時間」（now + animationSec）
  if (open.drawAt <= now) {
    const locked = await prisma.lottoRound.update({
      where: { id: open.id },
      data: {
        status: "LOCKED",
        drawAt: new Date(Date.now() + cfg.animationSec * 1000),
      },
      select: { id: true, code: true, drawAt: true, status: true },
    });
    return noStore({ ok: true, action: "LOCK", round: locked });
  }

  // 3) 有 LOCKED 且動畫到點 → DRAW（開出號碼）
  const locked = await prisma.lottoRound.findFirst({
    where: { status: "LOCKED", drawAt: { lte: now } }, // 動畫到點
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
    return noStore({ ok: true, action: "DRAW", round: drawn });
  }

  // 4) 有 DRAWN → 立刻結算（PAID），並 OPEN 下一期
  const drawn = await prisma.lottoRound.findFirst({
    where: { status: "DRAWN" },
    orderBy: [{ code: "asc" }],
    select: { id: true, code: true, numbers: true, special: true },
  });

  if (drawn) {
    const winNums = drawn.numbers || [];
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
            const picks = [...(b.picks || [])].sort((a, c) => a - c);
            matched = picks.filter((n) => winNums.includes(n)).length;
            const odd = ({ 3: 5, 4: 50, 5: 1_000, 6: 50_000 } as Record<number, number>)[matched] || 0;
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
              const key =
                b.kind === "SPECIAL_ODD" ? "ODD" :
                b.kind === "SPECIAL_EVEN" ? "EVEN" :
                b.kind === "SPECIAL_BIG" ? "BIG" : "SMALL";
              const odd = (ODDS.SPECIAL as any)[key] as number;
              payout = Math.floor(b.amount * odd);
              status = "WON";
              hitSpecial = true;
            }
          } else if (b.kind === "BALL_ATTR") {
            const idx = (b.ballIndex || 0) - 1;
            if (idx >= 0 && idx < winNums.length && b.attr) {
              const attrs = perBallAttr(winNums[idx]); // BIG/SMALL/ODD/EVEN -> boolean
              const key = String(b.attr) as keyof typeof attrs;
              if (attrs[key]) {
                const odd = (ODDS.BALL_ATTR as any)[key] as number;
                payout = Math.floor(b.amount * odd);
                status = "WON";
              }
            }
          }

          await tx.lottoBet.update({
            where: { id: b.id },
            data: { status, payout, matched, hitSpecial },
          });

          if (payout > 0) {
            const user = await tx.user.update({
              where: { id: b.userId },
              data: { balance: { increment: payout } },
              select: { balance: true, bankBalance: true },
            });

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
                meta: {
                  roundId: drawn.id,
                  roundCode: drawn.code,
                  betId: b.id,
                  kind: b.kind,
                  amount: b.amount,
                  matched,
                  hitSpecial,
                } as Prisma.InputJsonValue,
              } as any,
            });

            totalJackpot += payout;
          }
        }
      });
    }

    await prisma.lottoBet.updateMany({
      where: { roundId: drawn.id, status: "WON" },
      data: { status: "PAID" },
    });

    const settled = await prisma.lottoRound.update({
      where: { id: drawn.id },
      data: { status: "SETTLED", jackpot: totalJackpot },
      select: { id: true, code: true, status: true, jackpot: true },
    });

    // 立刻開下一期（下注 5 分鐘）
    const nextCode = await nextRoundCode();
    const nextDrawAt = new Date(Date.now() + cfg.drawIntervalSec * 1000);
    const opened = await prisma.lottoRound.create({
      data: { code: nextCode, drawAt: nextDrawAt, status: "OPEN", numbers: [] },
      select: { id: true, code: true, drawAt: true, status: true },
    });

    return noStore({
      ok: true,
      action: "SETTLE+OPEN",
      round: settled,
      next: opened,
      paidOut: totalJackpot,
    });
  }

  // 沒事可做
  return noStore({ ok: true, action: "NOOP" });
}
