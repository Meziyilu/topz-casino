// app/api/casino/baccarat/admin/reveal/route.ts
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
});

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const parsed = Q.safeParse({ room: searchParams.get("room") ?? "" });
    if (!parsed.success) {
      return NextResponse.json({ error: "BAD_PARAM" }, { status: 400 });
    }

    const room = parsed.data.room as RoomCode;

    // 找到目前該房「正在下注中的回合」
    const cur = await prisma.round.findFirst({
      where: { room, phase: "BETTING" },
      orderBy: { startedAt: "desc" },
      select: { id: true, phase: true },
    });

    if (!cur) {
      return NextResponse.json({ error: "NO_BETTING_ROUND" }, { status: 404 });
    }

    // 進入 REVEALING（不寫任何 cardsXXX/endsAt 等你 schema 沒有的欄位）
    const updated = await prisma.round.update({
      where: { id: cur.id },
      data: { phase: "REVEALING" },
      select: { id: true, room: true, phase: true, startedAt: true },
    });

    return NextResponse.json({ ok: true, round: updated });
  } catch (e: any) {
    console.error("[admin/reveal] error:", e);
    return NextResponse.json({ error: "SERVER_ERROR", detail: e?.message }, { status: 500 });
  }
}
