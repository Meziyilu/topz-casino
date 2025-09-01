// app/api/admin/lotto/round/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyJWTFromRequest } from "@/lib/authz";
import {
  DEFAULT_LOTTO_CONFIG,
  LOTTO_CONFIG_KEY,
  pick6of49,
  ODDS,
  isOdd,
  isBig,
  perBallAttr,
  type LottoConfig,
} from "@/lib/lotto";
import { z } from "zod";
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

/** 僅允許 POST +（可選）JSON content-type（OPEN/LOCK/DRAW/SETTLE 都用 POST action） */
function verifyMethodAndContentType(req: Request) {
  if (req.method !== "POST") throw new Error("METHOD_NOT_ALLOWED");
  const ct = req.headers.get("content-type") || "";
  // 本 API 需要 body（action），必須為 JSON
  if (!ct.includes("application/json")) throw new Error("INVALID_CONTENT_TYPE");
}

/** Admin 驗證 */
async function requireAdmin(req: Request) {
  const t = await verifyJWTFromRequest(req);
  if (!t || !t.isAdmin) throw new Error("FORBIDDEN");
  return t;
}

/** 讀取彩券設定（保留給未來需要時用） */
async function readConfig(): Promise<LottoConfig> {
  const row = await prisma.gameConfig.findUnique({ where: { key: LOTTO_CONFIG_KEY } });
  if (!row) return DEFAULT_LOTTO_CONFIG;
  return { ...DEFAULT_LOTTO_CONFIG, ...(row.value as Partial<LottoConfig>) };
}

/** 下一期代碼 */
async function nextRoundCode(): Promise<number> {
  const last = await prisma.lottoRound.findFirst({
    orderBy: [{ code: "desc" }],
    select: { code: true },
  });
  return last ? last.code + 1 : 1;
}

/** 安全索引賠率 */
function getSpecialOdd(kind: "ODD" | "EVEN" | "BIG" | "SMALL"): number {
  return ODDS.SPECIAL[kind];
}
function getBallAttrOdd(kind: "ODD" | "EVEN" | "BIG" | "SMALL"): number {
  return ODDS.BALL_ATTR[kind];
}

/** Body schema（嚴格型別） */
const BodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("OPEN"),
    code: z.number().int().positive().optional(),
    drawAt: z.union([z.string().datetime(), z.coerce.date()]).optional(),
  }),
  z.object({
    action: z.literal("LOCK"),
    code: z.number().int().positive().optional(),
  }),
  z.object({
    action: z.literal("DRAW"),
    code: z.number().int().positive().optional(),
  }),
  z.object({
    action: z.literal("SETTLE"),
    code: z.number().int().positive().optional(),
  }),
]);
type AdminBody = z.infer<typeof BodySchema>;

/** 依動作自動尋找對應回合（可指定 code） */
async function requireRoundFor(action: "LOCK" | "DRAW" | "SETTLE", code?: number) {
  if (typeof code === "number") {
    const r = await prisma.lottoRound.findUnique({
      where: { code },
      select: { id: true, code: true, status: true, drawAt: true },
    });
    if (!r) throw new Error("ROUND_NOT_FOUND");
    return r;
  }
  const needStatus = action === "LOCK" ? "OPEN" : action === "DRAW" ? "LOCKED" : "DRAWN";
  const r = await prisma.lottoRound.findFirst({
    where: { status: needStatus },
    orderBy: [{ code: "desc" }],
    select: { id: true, code: true, status: true, drawAt: true },
  });
  if (!r) throw new Error("ROUND_NOT_FOUND");
  return r;
}

/** 回傳型別 */
type Ok =
  | { ok: true; action: "OPEN"; round: { id: string; code: number; drawAt: string; status: "OPEN" } }
  | { ok: true; action: "LOCK"; round: { id: string; code: number; status: "LOCKED" } }
  | {
      ok: true; action: "DRAW";
      round: { id: string; code: number; status: "DRAWN"; numbers: number[]; special: number }
    }
  | {
      ok: true; action: "SETTLE";
      round: { id: string; code: number; status: "SETTLED"; jackpot: number };
      paidOut: number
    };
type Err =
  | { ok: false; error: "METHOD_NOT_ALLOWED" | "INVALID_CONTENT_TYPE" | "FORBIDDEN" | "ROUND_NOT_FOUND" | "ROUND_NOT_OPEN" | "ROUND_NOT_LOCKED" | "ROUND_NOT_DRAWN" | "ROUND_NOT_READY" | "INVALID_INPUT" | "ALREADY_OPEN" | "SETTLE_FAILED" | "SERVER_ERROR" };

export async function POST(req: Request) {
  try {
    verifyMethodAndContentType(req);
    await requireAdmin(req);

    // 一次讀 body + 嚴格解析
    const raw = await req.json();
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return noStoreJson<Err>({ ok: false, error: "INVALID_INPUT" }, 400);
    }
    const body = parsed.data as AdminBody;

    // 有需要時載入設定（目前未使用，保留）
    await readConfig();

    // OPEN
    if (body.action === "OPEN") {
      const existingOpen = await prisma.lottoRound.findFirst({
        where: { status: "OPEN" },
        select: { id: true, code: true },
      });
      if (existingOpen) return noStoreJson<Err>({ ok: false, error: "ALREADY_OPEN" }, 400);

      const code = body.code ?? (await nextRoundCode());
      const drawAtDate =
        body.drawAt instanceof Date
          ? body.drawAt
          : body.drawAt
          ? new Date(body.drawAt)
          : new Date(Date.now() + 20_000);

      const created = await prisma.lottoRound.create({
        data: { code, drawAt: drawAtDate, status: "OPEN", numbers: [] },
        select: { id: true, code: true, drawAt: true, status: true },
      });
      return noStoreJson<Ok>({
        ok: true,
        action: "OPEN",
        round: {
          id: created.id,
          code: created.code,
          drawAt: created.drawAt.toISOString(),
          status: "OPEN",
        },
      });
    }

    // LOCK
    if (body.action === "LOCK") {
      try {
        const r = await requireRoundFor("LOCK", body.code);
        if (r.status !== "OPEN") return noStoreJson<Err>({ ok: false, error: "ROUND_NOT_OPEN" }, 400);

        const updated = await prisma.lottoRound.update({
          where: { id: r.id },
          data: { status: "LOCKED" },
          select: { id: true, code: true, status: true },
        });

        return noStoreJson<Ok>({ ok: true, action: "LOCK", round: { ...updated, status: "LOCKED" } });
      } catch (e) {
        if (e instanceof Error && e.message === "ROUND_NOT_FOUND") {
          return noStoreJson<Err>({ ok: false, error: "ROUND_NOT_FOUND" }, 404);
        }
        throw e;
      }
    }

    // DRAW
    if (body.action === "DRAW") {
      try {
        const r = await requireRoundFor("DRAW", body.code);
        if (r.status !== "LOCKED") return noStoreJson<Err>({ ok: false, error: "ROUND_NOT_LOCKED" }, 400);

        const { numbers, special } = pick6of49();
        const updated = await prisma.lottoRound.update({
          where: { id: r.id },
          data: { status: "DRAWN", numbers, special },
          select: { id: true, code: true, status: true, numbers: true, special: true },
        });

        return noStoreJson<Ok>({
          ok: true,
          action: "DRAW",
          round: {
            id: updated.id,
            code: updated.code,
            status: "DRAWN",
            numbers: updated.numbers ?? [],
            special: updated.special!,
          },
        });
      } catch (e) {
        if (e instanceof Error && e.message === "ROUND_NOT_FOUND") {
          return noStoreJson<Err>({ ok: false, error: "ROUND_NOT_FOUND" }, 404);
        }
        throw e;
      }
    }

    // SETTLE
    if (body.action === "SETTLE") {
      try {
        const r = await requireRoundFor("SETTLE", body.code);
        if (r.status !== "DRAWN") return noStoreJson<Err>({ ok: false, error: "ROUND_NOT_DRAWN" }, 400);

        const round = await prisma.lottoRound.findUnique({
          where: { id: r.id },
          select: { id: true, code: true, numbers: true, special: true },
        });
        if (!round || !round.numbers?.length || !round.special) {
          return noStoreJson<Err>({ ok: false, error: "ROUND_NOT_READY" }, 400);
        }

        const winNums = round.numbers;
        const sp = round.special;

        const bets = await prisma.lottoBet.findMany({
          where: { roundId: r.id, status: { in: ["PENDING"] } },
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
                  const key = String(b.attr) as keyof typeof attrs;
                  if (attrs[key]) {
                    const odd = getBallAttrOdd(key as "BIG" | "SMALL" | "ODD" | "EVEN");
                    payout = Math.floor(b.amount * odd);
                    status = "WON";
                  }
                }
              }

              // 更新注單
              await tx.lottoBet.update({
                where: { id: b.id },
                data: { status, payout, matched, hitSpecial },
              });

              // 派彩：交易內直接查餘額 + 寫 ledger（meta = Prisma.InputJsonValue）
              if (payout > 0) {
                const user = await tx.user.update({
                  where: { id: b.userId },
                  data: { balance: { increment: payout } },
                  select: { balance: true, bankBalance: true },
                });

                const meta: Prisma.InputJsonValue = {
                  roundId: round.id,
                  roundCode: round.code,
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
                    memo: `Lotto payout for round ${round.code}`,
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

        // WON → PAID
        await prisma.lottoBet.updateMany({
          where: { roundId: r.id, status: "WON" },
          data: { status: "PAID" },
        });

        const updatedRound = await prisma.lottoRound.update({
          where: { id: r.id },
          data: { status: "SETTLED", jackpot: totalJackpot },
          select: { id: true, code: true, status: true, jackpot: true },
        });

        return noStoreJson<Ok>({
          ok: true,
          action: "SETTLE",
          round: { ...updatedRound }, // 無日期欄位需正規化
          paidOut: totalJackpot,
        });
      } catch (e) {
        if (e instanceof Error && e.message === "ROUND_NOT_FOUND") {
          return noStoreJson<Err>({ ok: false, error: "ROUND_NOT_FOUND" }, 404);
        }
        return noStoreJson<Err>({ ok: false, error: "SETTLE_FAILED" }, 500);
      }
    }

    // 未知動作
    return noStoreJson<Err>({ ok: false, error: "INVALID_INPUT" }, 400);
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "METHOD_NOT_ALLOWED") {
        return noStoreJson<Err>({ ok: false, error: "METHOD_NOT_ALLOWED" }, 405);
      }
      if (err.message === "INVALID_CONTENT_TYPE") {
        return noStoreJson<Err>({ ok: false, error: "INVALID_CONTENT_TYPE" }, 415);
      }
      if (err.message === "FORBIDDEN") {
        return noStoreJson<Err>({ ok: false, error: "FORBIDDEN" }, 403);
      }
    }
    return noStoreJson<Err>({ ok: false, error: "SERVER_ERROR" }, 500);
  }
}
