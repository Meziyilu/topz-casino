// app/api/admin/lotto/round/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyRequest } from "@/lib/jwt";
import {
  DEFAULT_LOTTO_CONFIG, LOTTO_CONFIG_KEY, pick6of49,
  ODDS, isOdd, isBig, perBallAttr, type LottoConfig,
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

type AdminBody =
  | { action: "OPEN"; code?: number; drawAt?: string | Date }
  | { action: "LOCK"; code?: number }
  | { action: "DRAW"; code?: number }
  | { action: "SETTLE"; code?: number };

async function nextRoundCode(): Promise<number> {
  const last = await prisma.lottoRound.findFirst({ orderBy: [{ code: "desc" }], select: { code: true } });
  return last ? last.code + 1 : 1;
}

export async function POST(req: Request) {
  const auth = verifyRequest(req);
  if (!auth?.isAdmin) return noStore({ error: "FORBIDDEN" }, 403);

  let body: AdminBody;
  try { body = await req.json(); } catch { return noStore({ error: "INVALID_JSON" }, 400); }

  await readConfig(); // 目前未用到，但預留（抽成/限額等）

  if (body.action === "OPEN") {
    const existingOpen = await prisma.lottoRound.findFirst({ where: { status: "OPEN" }, select: { id: true, code: true } });
    if (existingOpen) return noStore({ error: "ALREADY_OPEN", code: existingOpen.code }, 400);
    const code = body.code ?? (await nextRoundCode());
    const drawAt = body.drawAt ? new Date(body.drawAt) : new Date(Date.now() + 20_000);
    const created = await prisma.lottoRound.create({
      data: { code, drawAt, status: "OPEN", numbers: [] },
      select: { id: true, code: true, drawAt: true, status: true },
    });
    return noStore({ ok: true, round: created });
  }

  async function requireRoundFor(action: "LOCK" | "DRAW" | "SETTLE", code?: number) {
    if (typeof code === "number") {
      const r = await prisma.lottoRound.findUnique({ where: { code }, select: { id: true, code: true, status: true, drawAt: true } });
      if (!r) throw new Error("ROUND_NOT_FOUND");
      return r;
    }
    const status = action === "LOCK" ? "OPEN" : action === "DRAW" ? "LOCKED" : "DRAWN";
    const r = await prisma.lottoRound.findFirst({
      where: { status },
      orderBy: [{ code: "desc" }],
      select: { id: true, code: true, status: true, drawAt: true },
    });
    if (!r) throw new Error("ROUND_NOT_FOUND");
    return r;
  }

  if (body.action === "LOCK") {
    try {
      const r = await requireRoundFor("LOCK", body.code);
      if (r.status !== "OPEN") return noStore({ error: "ROUND_NOT_OPEN" }, 400);
      const updated = await prisma.lottoRound.update({ where: { id: r.id }, data: { status: "LOCKED" }, select: { id: true, code: true, status: true } });
      return noStore({ ok: true, round: updated });
    } catch (e: any) {
      if (e?.message === "ROUND_NOT_FOUND") return noStore({ error: "ROUND_NOT_FOUND" }, 404);
      throw e;
    }
  }

  if (body.action === "DRAW") {
    try {
      const r = await requireRoundFor("DRAW", body.code);
      if (r.status !== "LOCKED") return noStore({ error: "ROUND_NOT_LOCKED" }, 400);
      const { numbers, special } = pick6of49();
      const updated = await prisma.lottoRound.update({
        where: { id: r.id }, data: { status: "DRAWN", numbers, special },
        select: { id: true, code: true, status: true, numbers: true, special: true },
      });
      return noStore({ ok: true, round: updated });
    } catch (e: any) {
      if (e?.message === "ROUND_NOT_FOUND") return noStore({ error: "ROUND_NOT_FOUND" }, 404);
      throw e;
    }
  }

  if (body.action === "SETTLE") {
    try {
      const r = await requireRoundFor("SETTLE", body.code);
      if (r.status !== "DRAWN") return noStore({ error: "ROUND_NOT_DRAWN" }, 400);

      const round = await prisma.lottoRound.findUnique({
        where: { id: r.id }, select: { id: true, code: true, numbers: true, special: true },
      });
      if (!round || !round.numbers?.length || !round.special) return noStore({ error: "ROUND_NOT_READY" }, 400);

      const winNums = round.numbers;
      const sp = round.special;

      const bets = await prisma.lottoBet.findMany({
        where: { roundId: r.id, status: { in: ["PENDING"] } },
        select: { id: true, userId: true, kind: true, picks: true, amount: true, ballIndex: true, attr: true },
      });

      const BATCH = 200;
      let totalJackpot = 0;

      for (let i = 0; i < bets.length; i += BATCH) {
        const slice = bets.slice(i, i + BATCH);
        await prisma.$transaction(async (tx) => {
          for (const b of slice) {
            let payout = 0, matched = 0, hitSpecial = false, status: "LOST" as "WON"|"LOST";

            if (b.kind === "PICKS") {
              const picks = [...(b.picks || [])].sort((a, c) => a - c);
              matched = picks.filter(n => winNums.includes(n)).length;
              const odd = ({3:5,4:50,5:1_000,6:50_000} as Record<number,number>)[matched] || 0;
              if (odd > 0) { payout = Math.floor(b.amount * odd); status = "WON"; }
            } else if (
              b.kind === "SPECIAL_ODD" || b.kind === "SPECIAL_EVEN" ||
              b.kind === "SPECIAL_BIG" || b.kind === "SPECIAL_SMALL"
            ) {
              const ok =
                (b.kind === "SPECIAL_ODD" && (sp & 1) === 1) ||
                (b.kind === "SPECIAL_EVEN" && (sp & 1) === 0) ||
                (b.kind === "SPECIAL_BIG" && sp >= 25) ||
                (b.kind === "SPECIAL_SMALL" && sp < 25);
              if (ok) {
                const odd = 1.9;
                payout = Math.floor(b.amount * odd);
                status = "WON";
                hitSpecial = true;
              }
            } else if (b.kind === "BALL_ATTR") {
              const idx = (b.ballIndex || 0) - 1;
              if (idx >= 0 && idx < winNums.length && b.attr) {
                const val = winNums[idx];
                const attrs = { BIG: val >= 25, SMALL: val < 25, ODD: (val & 1) === 1, EVEN: (val & 1) === 0 };
                if (attrs[String(b.attr) as keyof typeof attrs]) {
                  const odd = 1.9;
                  payout = Math.floor(b.amount * odd);
                  status = "WON";
                }
              }
            }

            await tx.lottoBet.update({ where: { id: b.id }, data: { status, payout, matched, hitSpecial } });

            if (payout > 0) {
              const user = await tx.user.update({
                where: { id: b.userId }, data: { balance: { increment: payout } },
                select: { balance: true, bankBalance: true },
              });

              await tx.ledger.create({
                data: {
                  userId: b.userId, type: "PAYOUT", target: "WALLET",
                  delta: payout, balanceAfter: user.balance, bankAfter: user.bankBalance,
                  memo: `Lotto payout for round ${round.code}`,
                  fromTarget: null, toTarget: "WALLET", amount: payout, fee: 0,
                  transferGroupId: null, peerUserId: null,
                  meta: { roundId: round.id, roundCode: round.code, betId: b.id, kind: b.kind, amount: b.amount } as Prisma.InputJsonValue,
                } as any,
              });

              totalJackpot += payout;
            }
          }
        });
      }

      await prisma.lottoBet.updateMany({ where: { roundId: r.id, status: "WON" }, data: { status: "PAID" } });

      const updatedRound = await prisma.lottoRound.update({
        where: { id: r.id }, data: { status: "SETTLED", jackpot: totalJackpot },
        select: { id: true, code: true, status: true, jackpot: true },
      });

      return noStore({ ok: true, round: updatedRound, paidOut: totalJackpot });
    } catch (e: any) {
      if (e?.message === "ROUND_NOT_FOUND") return noStore({ error: "ROUND_NOT_FOUND" }, 404);
      return noStore({ error: "SETTLE_FAILED" }, 500);
    }
  }

  return noStore({ error: "UNKNOWN_ACTION" }, 400);
}
