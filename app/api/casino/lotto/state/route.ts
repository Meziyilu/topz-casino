// app/api/casino/lotto/state/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { readConfig } from "@/services/lotto.service";
import { startLottoScheduler } from "@/lib/lotto-scheduler";

export async function GET() {
  // 啟動排程（免登入）
  startLottoScheduler();

  const cfg = await readConfig();
  const openOrLocked = await prisma.lottoDraw.findFirst({
    where: { status: { in: ["OPEN", "LOCKED"] } },
    orderBy: { drawAt: "asc" }
  });
  const latest = await prisma.lottoDraw.findFirst({ orderBy: { drawAt: "desc" } });

  return NextResponse.json({
    current: openOrLocked ? {
      id: openOrLocked.id,
      code: openOrLocked.code,
      drawAt: openOrLocked.drawAt,
      status: openOrLocked.status as "OPEN"|"LOCKED",
      numbers: openOrLocked.numbers,
      special: openOrLocked.special,
      pool: openOrLocked.pool,
      jackpot: openOrLocked.jackpot,
    } : null,
    last: latest && latest.status === "SETTLED" ? {
      id: latest.id, code: latest.code, numbers: latest.numbers, special: latest.special
    } : null,
    config: cfg,
    serverTime: new Date().toISOString(),
    locked: openOrLocked?.status === "LOCKED",
  });
}
