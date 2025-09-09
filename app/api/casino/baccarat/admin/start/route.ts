// app/api/casino/baccarat/admin/start/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import type { RoomCode } from "@prisma/client";

export const dynamic = "force-dynamic";

const Q = z.object({
  room: z
    .string()
    .transform(s => s.toUpperCase())
    .pipe(z.enum(["R30","R60","R90"] as const)),
  seconds: z.coerce.number().int().min(5).max(600).default(60),
  force: z.coerce.boolean().optional().default(false),
});

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const parsed = Q.safeParse({
      room: searchParams.get("room") ?? "",
      seconds: searchParams.get("seconds") ?? "",
      force: searchParams.get("force") ?? "false",
    });
    if (!parsed.success) {
      return NextResponse.json({ error: "BAD_PARAM" }, { status: 400 });
    }

    const room = parsed.data.room as RoomCode;
    const force = parsed.data.force;

    // 是否有未結束回合（非 SETTLED 即視為進行中）
    const active = await prisma.round.findFirst({
      where: { room, NOT: { phase: "SETTLED" } },
      select: { id: true, phase: true },
    });

    if (active && !force) {
      // 有進行中且沒要求強制，就 409
      return NextResponse.json({ error: "ROUND_ACTIVE" }, { status: 409 });
    }

    // 若強制，先把現有回合收掉
    if (active && force) {
      await prisma.round.update({
        where: { id: active.id },
        data: { phase: "SETTLED" },
      });
    }

    // 新開一局（只寫 phase / startedAt，不碰 endsAt）
    const now = new Date();
    const created = await prisma.round.create({
      data: { room, phase: "BETTING", startedAt: now },
      select: { id: true, room: true, phase: true, startedAt: true },
    });

    // 前端/state 會用 startedAt + secondsPerRound 算倒數
    return NextResponse.json({ ok: true, round: created });
  } catch (e: any) {
    console.error("[admin/start] error:", e);
    return NextResponse.json({ error: "SERVER_ERROR", detail: e?.message }, { status: 500 });
  }
}
