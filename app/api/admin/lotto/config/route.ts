// app/api/admin/lotto/config/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyRequest } from "@/lib/jwt";
import { DEFAULT_LOTTO_CONFIG, LOTTO_CONFIG_KEY, type LottoConfig } from "@/lib/lotto";
import type { Prisma } from "@prisma/client";

const noStore = <T,>(payload: T, status = 200) =>
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

function validatePatch(body: Partial<LottoConfig>) {
  const next = { ...DEFAULT_LOTTO_CONFIG, ...body };
  if (next.game !== "6/49") return { ok: false as const, error: "UNSUPPORTED_GAME" };

  // 下注時長：建議 60 ~ 3600 秒之間
  if (!Number.isInteger(next.drawIntervalSec) || next.drawIntervalSec < 60 || next.drawIntervalSec > 3600)
    return { ok: false as const, error: "INVALID_drawIntervalSec" };

  // 動畫緩衝：建議 5 ~ 120 秒之間
  if (!Number.isInteger(next.animationSec) || next.animationSec < 5 || next.animationSec > 120)
    return { ok: false as const, error: "INVALID_animationSec" };

  if (typeof next.allowSpecialOddEven !== "boolean")
    return { ok: false as const, error: "INVALID_allowSpecialOddEven" };
  if (typeof next.allowSpecialBigSmall !== "boolean")
    return { ok: false as const, error: "INVALID_allowSpecialBigSmall" };
  if (typeof next.allowBallBigSmall !== "boolean")
    return { ok: false as const, error: "INVALID_allowBallBigSmall" };

  if (!Number.isInteger(next.minBet) || next.minBet < 1 || next.minBet > 10000)
    return { ok: false as const, error: "INVALID_minBet" };
  if (
    !Number.isInteger(next.maxBetPerTicket) ||
    next.maxBetPerTicket < next.minBet ||
    next.maxBetPerTicket > 5_000_000
  )
    return { ok: false as const, error: "INVALID_maxBetPerTicket" };

  return { ok: true as const, next };
}

// 讀取設定（維持你原本的回傳型態：直接回 config 物件）
export async function GET() {
  const cfg = await readConfig();
  return noStore(cfg);
}

export async function POST(req: Request) {
  // 驗證 + 管理員確認（以 DB 為準）
  const auth = await verifyRequest(req);
  const userId =
    (auth as { userId?: string; sub?: string } | null)?.userId ??
    (auth as { sub?: string } | null)?.sub ??
    null;

  if (!userId) return noStore({ error: "UNAUTH" } as const, 401);

  const me = await prisma.user.findUnique({
    where: { id: String(userId) },
    select: { isAdmin: true },
  });
  if (!me?.isAdmin) return noStore({ error: "FORBIDDEN" } as const, 403);

  let patch: Partial<LottoConfig>;
  try {
    patch = (await req.json()) as Partial<LottoConfig>;
  } catch {
    return noStore({ error: "INVALID_JSON" } as const, 400);
  }

  const v = validatePatch(patch);
  if (!v.ok) return noStore({ error: v.error } as const, 400);

  await prisma.gameConfig.upsert({
    where: { key: LOTTO_CONFIG_KEY },
    update: { value: v.next as unknown as Prisma.InputJsonValue },
    create: { key: LOTTO_CONFIG_KEY, value: v.next as unknown as Prisma.InputJsonValue },
  });

  return noStore({ ok: true, config: v.next } as const);
}
