// app/api/admin/lotto/reset-room/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { readConfig, ensureOpenDraw } from "@/services/lotto.service";
import { startLottoScheduler, stopLottoScheduler, isSchedulerRunning } from "@/lib/lotto-scheduler";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const restartScheduler = body?.restartScheduler !== false; // 預設 true

    // 停掉現行排程（若有）
    if (isSchedulerRunning()) stopLottoScheduler();

    // 清空所有期數與注單
    await prisma.$transaction(async (tx) => {
      await tx.lottoBet.deleteMany({});
      await tx.lottoDraw.deleteMany({});
    });

    // 建立第一期（對齊台北 00:00 的 slot）
    const cfg = await readConfig();
    const next = await ensureOpenDraw(new Date(), cfg);

    // 需要的話重啟排程
    if (restartScheduler) startLottoScheduler();

    return NextResponse.json({ ok: true, next, restarted: restartScheduler });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
