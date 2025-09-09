// app/api/casino/baccarat/admin/force-next/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import type { RoomCode } from "@prisma/client";

export const dynamic = "force-dynamic";

const Q = z.object({
  room: z
    .string()
    .transform((s) => s.toUpperCase())
    .pipe(z.enum(["R30", "R60", "R90"] as const)),
  seconds: z.coerce.number().int().min(5).max(600).default(60),
});

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const parsed = Q.safeParse({
      room: searchParams.get("room") ?? "",
      seconds: searchParams.get("seconds") ?? "",
    });
    if (!parsed.success) {
      return NextResponse.json({ error: "BAD_PARAM" }, { status: 400 });
    }
    const room = parsed.data.room as RoomCode;
    const seconds = parsed.data.seconds;

    // 若有未結束回合，先把它標記為 SETTLED（或你也可直接 409）
    const active = await prisma.round.findFirst({
      where: { room, NOT: { phase: "SETTLED" } },
      select: { id: true, phase: true },
    });
    if (active) {
      await prisma.round.update({
        where: { id: active.id },
        data: { phase: "SETTLED" },
      });
    }

    const now = new Date();
    const created = await prisma.round.create({
      data: { room, phase: "BETTING", startedAt: now },
      select: { id: true, room: true, phase: true, startedAt: true },
    });

    // 提醒：state API 會用 startedAt + secondsPerRound 算倒數；
    // 若你想用這次 seconds 覆蓋，請記得在 /admin/config 設進記憶體或資料表（可選）

    return NextResponse.json({ ok: true, round: created, seconds });
  } catch (e: any) {
    console.error("[force-next] error:", e);
    return NextResponse.json(
      { error: "SERVER_ERROR", detail: e?.message },
      { status: 500 }
    );
  }
}
