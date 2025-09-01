export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyRequest } from "@/lib/jwt";
import { DEFAULT_LOTTO_CONFIG, LOTTO_CONFIG_KEY, type LottoConfig } from "@/lib/lotto";
import type { Prisma } from "@prisma/client";

type SpecialKind = "SPECIAL_ODD" | "SPECIAL_EVEN" | "SPECIAL_BIG" | "SPECIAL_SMALL";
type BallAttr = "BIG" | "SMALL" | "ODD" | "EVEN";

type BetBody = {
  roundCode?: number;
  roundId?: string;
  picks?: { numbers: number[]; amount: number };
  special?: { kind: SpecialKind; amount: number };
  perBall?: Array<{ index: number; attr: BallAttr; amount: number }>;
};

function noStore<T>(payload: T, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

async function readConfig(): Promise<LottoConfig> {
  const row = await prisma.gameConfig.findUnique({ where: { key: LOTTO_CONFIG_KEY } });
  if (!row) return DEFAULT_LOTTO_CONFIG;
  return { ...DEFAULT_LOTTO_CONFIG, ...(row.value as Partial<LottoConfig>) };
}

function normNumbers(ns: unknown): number[] | null {
  if (!Array.isArray(ns) || ns.length !== 6) return null;
  const arr = [...ns];
  if (!arr.every((n) => Number.isInteger(n) && n >= 1 && n <= 49)) return null;
  if (new Set(arr).size !== 6) return null;
  arr.sort((a, b) => a - b);
  return arr as number[];
}

const picksKeyFrom = (numbers: number[]) => numbers.join("-");

async function pickRoundId(body: BetBody): Promise<{ id: string; code: number }> {
  if (body.roundId) {
    const r = await prisma.lottoRound.findUnique({
      where: { id: body.roundId },
      select: { id: true, code: true, status: true },
    });
    if (!r) throw new Error("ROUND_NOT_FOUND");
    if (r.status !== "OPEN") throw new Error("ROUND_NOT_OPEN");
    return { id: r.id, code: r.code };
  }
  if (typeof body.roundCode === "number") {
    const r = await prisma.lottoRound.findUnique({
      where: { code: body.roundCode },
      select: { id: true, code: true, status: true },
    });
    if (!r) throw new Error("ROUND_NOT_FOUND");
    if (r.status !== "OPEN") throw new Error("ROUND_NOT_OPEN");
    return { id: r.id, code: r.code };
  }
  const r = await prisma.lottoRound.findFirst({
    where: { status: "OPEN" },
    orderBy: [{ drawAt: "asc" }],
    select: { id: true, code: true },
  });
  if (!r) throw new Error("NO_OPEN_ROUND");
  return { id: r.id, code: r.code };
}

export async function POST(req: Request) {
  const auth = await verifyRequest(req);
  const userId =
    (auth as { userId?: string; sub?: string } | null)?.userId ??
    (auth as { sub?: string } | null)?.sub ??
    null;
  if (!userId) return noStore({ error: "UNAUTHORIZED" }, 401);

  let body: BetBody;
  try {
    body = await req.json();
  } catch {
    return noStore({ error: "INVALID_JSON" }, 400);
  }

  const cfg = await readConfig();

  const round = await (async () => {
    try {
      return await pickRoundId(body);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg === "ROUND_NOT_FOUND") return null;
      if (msg === "ROUND_NOT_OPEN") return "ROUND_NOT_OPEN" as const;
      if (msg === "NO_OPEN_ROUND") return "NO_OPEN_ROUND" as const;
      return null;
    }
  })();

  if (!round) return noStore({ error: "ROUND_NOT_FOUND" }, 404);
  if (round === "ROUND_NOT_OPEN") return noStore({ error: "ROUND_NOT_OPEN" }, 400);
  if (round === "NO_OPEN_ROUND") return noStore({ error: "NO_OPEN_ROUND" }, 400);

  type InsertItem =
    | { kind: "PICKS"; amount: number; picks: number[]; picksKey: string }
    | { kind: SpecialKind; amount: number }
    | { kind: "BALL_ATTR"; amount: number; ballIndex: number; attr: BallAttr };

  const inserts: InsertItem[] = [];

  if (body.picks) {
    const nums = normNumbers(body.picks.numbers);
    if (!nums) return noStore({ error: "INVALID_NUMBERS" }, 400);
    if (!Number.isInteger(body.picks.amount) || body.picks.amount < cfg.minBet || body.picks.amount > cfg.maxBetPerTicket) {
      return noStore({ error: "INVALID_PICKS_AMOUNT", min: cfg.minBet, max: cfg.maxBetPerTicket }, 400);
    }
    inserts.push({ kind: "PICKS", amount: body.picks.amount, picks: nums, picksKey: picksKeyFrom(nums) });
  }

  if (body.special) {
    const k = body.special.kind;
    if ((k === "SPECIAL_ODD" || k === "SPECIAL_EVEN") && !cfg.allowSpecialOddEven) {
      return noStore({ error: "SPECIAL_ODD_EVEN_NOT_ALLOWED" }, 400);
    }
    if ((k === "SPECIAL_BIG" || k === "SPECIAL_SMALL") && !cfg.allowSpecialBigSmall) {
      return noStore({ error: "SPECIAL_BIG_SMALL_NOT_ALLOWED" }, 400);
    }
    if (!Number.isInteger(body.special.amount) || body.special.amount < cfg.minBet || body.special.amount > cfg.maxBetPerTicket) {
      return noStore({ error: "INVALID_SPECIAL_AMOUNT", min: cfg.minBet, max: cfg.maxBetPerTicket }, 400);
    }
    inserts.push({ kind: k, amount: body.special.amount });
  }

  if (body.perBall && body.perBall.length > 0) {
    if (!cfg.allowBallBigSmall) return noStore({ error: "PERBALL_NOT_ALLOWED" }, 400);
    for (const i of body.perBall) {
      if (!Number.isInteger(i.index) || i.index < 1 || i.index > 6) {
        return noStore({ error: "INVALID_BALL_INDEX", index: i.index }, 400);
      }
      if (!["BIG", "SMALL", "ODD", "EVEN"].includes(i.attr)) {
        return noStore({ error: "INVALID_BALL_ATTR", attr: i.attr }, 400);
      }
      if (!Number.isInteger(i.amount) || i.amount < cfg.minBet || i.amount > cfg.maxBetPerTicket) {
        return noStore(
          { error: "INVALID_PERBALL_AMOUNT", index: i.index, min: cfg.minBet, max: cfg.maxBetPerTicket },
          400
        );
      }
      inserts.push({ kind: "BALL_ATTR", amount: i.amount, ballIndex: i.index, attr: i.attr });
    }
  }

  if (inserts.length === 0) return noStore({ error: "EMPTY_BET" }, 400);

  const totalAmount = inserts.reduce((s, x) => s + x.amount, 0);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: String(userId) },
        select: { id: true, balance: true, bankBalance: true },
      });
      if (!user) throw new Error("USER_NOT_FOUND");
      if (user.balance < totalAmount) throw new Error("INSUFFICIENT_BALANCE");

      await Promise.all(
        inserts.map((item) => {
          if (item.kind === "PICKS") {
            return tx.lottoBet.create({
              data: {
                userId: user.id,
                roundId: round.id,
                kind: "PICKS",
                picks: item.picks,
                picksKey: item.picksKey,
                amount: item.amount,
              },
              select: { id: true },
            });
          }
          if (item.kind === "SPECIAL_ODD" || item.kind === "SPECIAL_EVEN" || item.kind === "SPECIAL_BIG" || item.kind === "SPECIAL_SMALL") {
            return tx.lottoBet.create({
              data: {
                userId: user.id,
                roundId: round.id,
                kind: item.kind,
                amount: item.amount,
                picks: [],
                picksKey: "-",
              },
              select: { id: true },
            });
          }
          return tx.lottoBet.create({
            data: {
              userId: user.id,
              roundId: round.id,
              kind: "BALL_ATTR",
              ballIndex: item.ballIndex!,
              attr: item.attr,
              amount: item.amount,
              picks: [],
              picksKey: "-",
            },
            select: { id: true },
          });
        })
      );

      const updated = await tx.user.update({
        where: { id: user.id },
        data: { balance: { decrement: totalAmount } },
        select: { balance: true, bankBalance: true },
      });

      await tx.ledger.create({
        data: {
          userId: user.id,
          type: "BET_PLACED",
          target: "WALLET", // Prisma enum: BalanceTarget
          delta: -totalAmount,
          balanceAfter: updated.balance,
          bankAfter: updated.bankBalance,
          memo: `Lotto bet for round ${round.code}`,
          fromTarget: "WALLET",
          toTarget: null,
          amount: totalAmount,
          fee: 0,
          transferGroupId: null,
          peerUserId: null,
          meta: {
            roundId: round.id,
            roundCode: round.code,
          } as Prisma.InputJsonValue,
        },
      });

      return { balanceAfter: updated.balance, bankAfter: updated.bankBalance };
    });

    return noStore({
      ok: true,
      userId: String(userId),
      round,
      balanceAfter: result.balanceAfter,
      bankAfter: result.bankAfter,
      meta: { serverTime: new Date().toISOString() },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    const code = (e as { code?: string } | null)?.code;
    if (msg === "USER_NOT_FOUND") return noStore({ error: "USER_NOT_FOUND" }, 404);
    if (msg === "INSUFFICIENT_BALANCE") return noStore({ error: "INSUFFICIENT_BALANCE" }, 400);
    if (code === "P2002") return noStore({ error: "DUPLICATE_BET" }, 409);
    return noStore({ error: "BET_FAILED" }, 500);
  }
}
