// app/api/admin/lotto/reset-room/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { readConfig } from "@/services/lotto.service";
import { startLottoScheduler, stopLottoScheduler, isSchedulerRunning, setResetting } from "@/lib/lotto-scheduler";

// 以台北時區計算當天 00:00（儲存為 UTC 落點）
function taipeiMidnight(d: Date) {
  const s = d.toLocaleString("zh-TW", { timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit" });
  const [y, m, day] = s.replace(/\//g, "-").split(" ")[0].split("-").map(Number);
  // 台北 00:00 = UTC-8 小時（此處不處理 DST，足夠用於遊戲日切）
  return new Date(Date.UTC(y, (m - 1), day, 0 - 8, 0, 0));
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const restartScheduler: boolean = body?.restartScheduler !== false; // 預設 true

  const wasRunning = isSchedulerRunning();
  try {
    // 1) 停排程並進入重製態
    if (wasRunning) stopLottoScheduler();
    setResetting(true);

    // 2) 清空注單與期數（不動 User/Ledger）
    await prisma.$transaction(async (tx) => {
      await tx.lottoBet.deleteMany({});
      await tx.lottoDraw.deleteMany({});
    });

    // 3) 直接建立「第一期」
    const cfg = await readConfig();
    const now = new Date();
    const day = taipeiMidnight(now);

    // 對齊「當天 00:00」後的最近槽位：每 interval 一局
    const base = day.getTime();
    const elapsed = Math.max(0, Math.floor((now.getTime() - base) / 1000));
    const nextSlot = Math.ceil(elapsed / cfg.drawIntervalSec) * cfg.drawIntervalSec;
    const drawAt = new Date(base + nextSlot * 1000);

    const first = await prisma.lottoDraw.create({
      data: {
        code: 1,            // ★ 局數歸 1
        daySeq: 1,          // ★ 當日序號歸 1
        day,                // 當日 00:00（台北）對應 UTC
        drawAt,
        numbers: [],
        special: null,
        pool: 0,
        jackpot: 0,
        status: "OPEN",
      }
    });

    // 4) 退出重製態，按需求重啟 scheduler
    setResetting(false);
    if (restartScheduler || wasRunning) startLottoScheduler();

    return NextResponse.json({ ok: true, first, restarted: (restartScheduler || wasRunning) });
  } catch (e: any) {
    // 發生例外也務必退出重製態
    setResetting(false);
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
