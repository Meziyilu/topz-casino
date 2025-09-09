// app/api/casino/baccarat/admin/daily-reset/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { RoomCode, RoundPhase } from "@prisma/client";

export const dynamic = "force-dynamic";

/** 依你資料庫時間（一般為 UTC）判斷是否「跨日」。
 *  若你要用台北時間，請把 now 先 +8h 再取 yyyy-mm-dd。 */
function ymd(d = new Date()) {
  // 若你要以台北時間為準 → 改成：new Date(d.getTime() + 8 * 3600 * 1000)
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const ROOMS: RoomCode[] = ["R30", "R60", "R90"];

/** 判斷某房「今天是否已經有第一局」。
 *  不需要 Setting 表，單純用 round.startedAt 的日期來判斷。 */
async function hasRoundToday(room: RoomCode, today: string) {
  // 取今天 00:00 ~ 明天 00:00（UTC）之間是否有任何 round
  const start = new Date(today + "T00:00:00.000Z");
  const end = new Date(new Date(start).getTime() + 24 * 3600 * 1000);

  const cnt = await prisma.round.count({
    where: {
      room,
      startedAt: { gte: start, lt: end },
    },
  });
  return cnt > 0;
}

/** 收尾：把極端狀態的上一日回合補成 SETTLED（不派彩，只是關帳）
 *  （自動派彩本來由 /admin/auto 處理；這裡避免跨日卡在 REVEALING 一直顯示中） */
async function forceCloseOldRounds(room: RoomCode, today: string) {
  const start = new Date(today + "T00:00:00.000Z");
  // 把「今天之前」且仍未結束的局，強制標記為 SETTLED（不變動餘額）
  await prisma.round.updateMany({
    where: {
      room,
      startedAt: { lt: start },
      phase: { in: ["BETTING", "REVEALING"] as RoundPhase[] },
    },
    data: { phase: "SETTLED" },
  });
}

/** 開新局（phase=BETTING） */
async function openNewRound(room: RoomCode) {
  await prisma.round.create({
    data: {
      room,
      phase: "BETTING",
      startedAt: new Date(),
    },
  });
}

export async function POST(req: NextRequest) {
  // 安全檢查（與 Cron Job 的 x-cron-key 對應）
  const secret = process.env.CRON_SECRET || "dev_secret";
  const key = req.headers.get("x-cron-key");
  if (!key || key !== secret) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const today = ymd(); // 以 UTC 作為一天邊界（若要台北，請改 ymd(new Date(Date.now()+8h))）

  // 為避免多個實例/多次觸發造成競態，對「每日任務」做一個資料庫層級的互斥鎖
  // 使用 Postgres advisory lock（不修改 schema）
  const LOCK_KEY = 424242; // 任一常數即可
  await prisma.$executeRawUnsafe(`SELECT pg_advisory_lock(${LOCK_KEY});`);
  try {
    for (const room of ROOMS) {
      // 1) 若今天已有局，跳過（做到「可重入、不重複」）
      const exists = await hasRoundToday(room, today);
      if (exists) continue;

      // 2) 收尾昨天未完成的局（不派彩，只標成 SETTLED 避免卡 UI）
      await forceCloseOldRounds(room, today);

      // 3) 開「今天的第一局」
      await openNewRound(room);
    }
  } finally {
    await prisma.$executeRawUnsafe(`SELECT pg_advisory_unlock(${LOCK_KEY});`);
  }

  return NextResponse.json({ ok: true, date: today });
}
