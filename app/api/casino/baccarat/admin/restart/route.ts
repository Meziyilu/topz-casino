import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { room } = (await req.json()) as { room: "R30"|"R60"|"R90" };
    const key = `room:${room}:shoeSeed`;

    // ✅ 用秒數存，避免 INT4 溢位
    await prisma.gameConfig.upsert({
      where: { gameCode_key: { gameCode: "BACCARAT", key } },
      create: { gameCode: "BACCARAT", key, valueInt: Math.floor(Date.now() / 1000) },
      update: { valueInt: Math.floor(Date.now() / 1000) },
    });

    // 將最新一局結束，下一次拉 state 會用新 seed 開局
    const cur = await prisma.round.findFirst({ where: { room }, orderBy: { startedAt: "desc" } });
    if (cur && cur.phase !== "SETTLED") {
      await prisma.round.update({ where: { id: cur.id }, data: { phase: "SETTLED" } });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "UNKNOWN_ERROR" }, { status: 500 });
  }
}
