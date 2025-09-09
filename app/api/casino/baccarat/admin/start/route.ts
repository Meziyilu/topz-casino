import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import type { RoomCode } from "@prisma/client";

export const dynamic = "force-dynamic";

const Q = z.object({
  room: z.string().transform(s => s.toUpperCase()).pipe(z.enum(["R30","R60","R90"] as const)),
  seconds: z.coerce.number().min(10).max(300).default(60),
});

function todayRangeTZ8() {
  // 取台北時區 00:00 ~ 23:59:59 範圍（用 UTC +8 近似）
  const now = new Date();
  const y = now.getUTCFullYear(), m = now.getUTCMonth(), d = now.getUTCDate();
  const start = new Date(Date.UTC(y, m, d, -8, 0, 0)); // 把 UTC 往回 8 小時 = 台灣今日 00:00
  const end = new Date(start.getTime() + 24*60*60*1000);
  return { start, end };
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const parsed = Q.safeParse({
      room: searchParams.get("room"),
      seconds: searchParams.get("seconds") ?? undefined,
    });
    if (!parsed.success) return NextResponse.json({ error: "BAD_QUERY" }, { status: 400 });
    const { room, seconds } = parsed.data;

    // 房內不允許同時存在 BETTING/REVEALING 的局
    const active = await prisma.round.findFirst({
      where: { room: room as RoomCode, phase: { in: ["BETTING","REVEALING"] } },
      orderBy: { startedAt: "desc" },
      select: { id: true, phase: true },
    });
    if (active) return NextResponse.json({ error: "ROUND_ACTIVE", roundId: active.id, phase: active.phase }, { status: 409 });

    const { start, end } = todayRangeTZ8();
    const todayCount = await prisma.round.count({
      where: { room: room as RoomCode, startedAt: { gte: start, lt: end } },
    });

    const round = await prisma.round.create({
      data: {
        room: room as RoomCode,
        phase: "BETTING",
        startedAt: new Date(),
        // 其它欄位(outcome/endedAt…)維持 null，局序用計算值回前端
      },
      select: { id: true, room: true, phase: true, startedAt: true },
    });

    return NextResponse.json({
      ok: true,
      roundId: round.id,
      phase: round.phase,
      roundSeq: todayCount + 1,
      durationSeconds: seconds,
    });
  } catch (e) {
    console.error("[admin/start]", e);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
