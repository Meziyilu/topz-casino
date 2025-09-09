import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { RoomCode, LedgerType } from "@prisma/client";

export const dynamic = "force-dynamic";

const ROOMS: RoomCode[] = ["R30","R60","R90"];

function requireCronKey(req: NextRequest) {
  const h = req.headers.get("x-cron-key");
  if (!h || h !== (process.env.CRON_SECRET || "dev_secret")) {
    throw new Error("UNAUTHORIZED_CRON");
  }
}

export async function POST(req: NextRequest) {
  try {
    requireCronKey(req);

    // 1) 清理：保留最近 2,000 局，其餘刪除（範例）
    for (const room of ROOMS) {
      const old = await prisma.round.findMany({
        where: { room },
        orderBy: { startedAt: "desc" },
        skip: 2000,
        select: { id: true },
      });
      const oldIds = old.map(o => o.id);
      if (oldIds.length) {
        await prisma.bet.deleteMany({ where: { roundId: { in: oldIds } } });
        await prisma.round.deleteMany({ where: { id: { in: oldIds } } });
      }
    }

    // 2) 重啟：每個房間開一個新的 BETTING 局
    const now = new Date();
    for (const room of ROOMS) {
      await prisma.round.create({ data: { room, phase: "BETTING", startedAt: now } });
    }

    return NextResponse.json({ ok: true });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e?.message || "SERVER_ERROR" }, { status: 500 });
  }
}
