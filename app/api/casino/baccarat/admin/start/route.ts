import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserOrThrow } from "@/lib/auth";
import type { RoomCode } from "@prisma/client";
import { getRoomInfo, settleRound } from "@/services/baccarat.service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const u = await getUserOrThrow(req);
    if (!u.isAdmin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

    const url = new URL(req.url);
    const room = (url.searchParams.get("room") || "R30").toUpperCase() as RoomCode;
    const seconds = Number(url.searchParams.get("seconds") || 30);

    const rc = await getRoomInfo(room); // 取靜態資訊
    const exists = await prisma.round.findFirst({
      where: { room },
      orderBy: { startedAt: "desc" },
    });

    // 若上一局還在 BETTING，直接回傳避免重複開
    if (exists?.phase === "BETTING") {
      return NextResponse.json({ ok: true, warn: "EXISTING_BETTING", id: exists.id });
    }

    const r = await prisma.round.create({
      data: {
        room,
        phase: "BETTING",
        startedAt: new Date(),
      },
      select: { id: true, room: true, phase: true, startedAt: true },
    });

    // 可選：把秒數記在哪（如果你的 schema 沒欄位，前端用 roomInfo.secondsPerRound 即可）
    return NextResponse.json({ ok: true, id: r.id, secondsPerRound: seconds || rc.secondsPerRound });
  } catch (e:any) {
    return NextResponse.json({ error: e?.message || "SERVER_ERROR" }, { status: 500 });
  }
}
