// app/api/admin/rooms/reset/route.ts
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

const asAny = <T = any>(v: unknown) => v as T;

function noStoreJson(payload: any, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

// 台北日切（今天 00:00 以 UTC 表示）
function taipeiDayStart(date = new Date()) {
  const utc = date.getTime();
  const tpe = utc + 8 * 3600_000;
  const tpeStart = Math.floor(tpe / 86_400_000) * 86_400_000;
  return new Date(tpeStart - 8 * 3600_000);
}

// 建立第一局
async function createFirstRoundTx(
  tx: Parameters<typeof prisma.$transaction>[0] extends (arg: infer T) => any ? T : any,
  roomId: string,
  dayStartUtc: Date
) {
  const now = new Date();
  return tx.round.create({
    data: {
      roomId,
      day: dayStartUtc,
      roundSeq: 1,
      phase: asAny("BETTING"),
      createdAt: now,
      startedAt: now,
    },
    select: { id: true, roundSeq: true },
  });
}

export async function POST(req: Request) {
  try {
    await requireAdmin(req);

    const dayStartUtc = taipeiDayStart(new Date());

    const rooms = await prisma.room.findMany({
      where: { code: { in: ["R30", "R60", "R90"] as any } },
      select: { id: true, code: true, durationSeconds: true },
    });
    if (rooms.length === 0) return noStoreJson({ error: "尚未建立房間 R30/R60/R90" }, 400);

    await prisma.$transaction(async (tx) => {
      // 刪掉「今天」的 rounds 與 bets（僅今天）
      const todayRoundIds = (
        await tx.round.findMany({
          where: { day: dayStartUtc, roomId: { in: rooms.map((r) => r.id) } },
          select: { id: true },
        })
      ).map((r) => r.id);

      if (todayRoundIds.length > 0) {
        await tx.bet.deleteMany({ where: { roundId: { in: todayRoundIds } } });
        await tx.round.deleteMany({ where: { id: { in: todayRoundIds } } });
      }

      // 為每個房間建立 round #1
      for (const r of rooms) {
        await createFirstRoundTx(tx, r.id, dayStartUtc);
      }
    });

    return noStoreJson({ ok: true, message: "已清空今日局數並重建三房的第 1 局" });
  } catch (e: any) {
    const msg = e?.message || "重置失敗";
    if (msg.includes("管理員權限")) return noStoreJson({ error: msg }, 403);
    return noStoreJson({ error: msg }, 400);
  }
}
