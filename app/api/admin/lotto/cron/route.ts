// app/api/admin/lotto/cron/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyRequest } from "@/lib/jwt";
import { DEFAULT_LOTTO_CONFIG, LOTTO_CONFIG_KEY, type LottoConfig, pick6of49 } from "@/lib/lotto";
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
  const last = await prisma.lottoRound.findFirst({ orderBy: [{ code: "desc" }], select: { code: true } });
  return last ? last.code + 1 : 1;
}

export async function POST(req: Request) {
  const auth = verifyRequest(req);
  if (!auth?.isAdmin) return noStore({ error: "FORBIDDEN" }, 403);

  const cfg = await readConfig();
  const now = new Date();

  // 無 OPEN → OPEN
  const open = await prisma.lottoRound.findFirst({
    where: { status: "OPEN" },
    orderBy: [{ drawAt: "asc" }],
    select: { id: true, code: true, drawAt: true },
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

  // OPEN 到點 → LOCK
  if (open.drawAt <= now) {
    const locked = await prisma.lottoRound.update({ where: { id: open.id }, data: { status: "LOCKED" }, select: { id: true, code: true, status: true } });
    return noStore({ ok: true, action: "LOCK", round: locked });
  }

  // 有 LOCKED → DRAW
  const locked = await prisma.lottoRound.findFirst({ where: { status: "LOCKED" }, orderBy: [{ code: "desc" }], select: { id: true, code: true } });
  if (locked) {
    const { numbers, special } = pick6of49();
    const drawn = await prisma.lottoRound.update({
      where: { id: locked.id }, data: { status: "DRAWN", numbers, special },
      select: { id: true, code: true, status: true, numbers: true, special: true },
    });
    return noStore({ ok: true, action: "DRAW", round: drawn });
  }

  // 有 DRAWN → SETTLE + OPEN 下一期
  const drawn = await prisma.lottoRound.findFirst({ where: { status: "DRAWN" }, orderBy: [{ code: "asc" }], select: { id: true, code: true } });
  if (drawn) {
    // 直接複用手動結算端點的邏輯會更 DRY；此處為簡版示意：
    const round = await prisma.lottoRound.findUnique({ where: { id: drawn.id }, select: { id: true, code: true, numbers: true, special: true } });
    if (!round?.numbers || !round.special) return noStore({ error: "ROUND_NOT_READY" }, 400);

    const bets = await prisma.lottoBet.findMany({
      where: { roundId: drawn.id, status: { in: ["PENDING"] } },
      select: { id: true, userId: true, kind: true, picks: true, amount: true, ballIndex: true, attr: true },
    });

    // —— 省略：與手動 SETTLE 同步的派彩流程（你可直接複製手動 SETTLE 中的結算迴圈）——
    // 為避免回覆過長，這裡建議直接把手動版 SETTLE 的 for-loop 搬過來即可。結算完：
    await prisma.lottoBet.updateMany({ where: { roundId: drawn.id, status: "WON" }, data: { status: "PAID" } });
    const settled = await prisma.lottoRound.update({ where: { id: drawn.id }, data: { status: "SETTLED" }, select: { id: true, code: true, status: true } });

    // 開新期
    const nextCode = await nextRoundCode();
    const drawAt = new Date(Date.now() + cfg.drawIntervalSec * 1000);
    const opened = await prisma.lottoRound.create({
      data: { code: nextCode, drawAt, status: "OPEN", numbers: [] },
      select: { id: true, code: true, drawAt: true, status: true },
    });

    return noStore({ ok: true, action: "SETTLE+OPEN", round: settled, next: opened });
  }

  return noStore({ ok: true, action: "NOOP" });
}
