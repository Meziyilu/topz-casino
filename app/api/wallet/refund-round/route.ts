// app/api/wallet/refund-round/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrRotateRound } from "@/services/sicbo.service"; // 假設這邊引用骰寶服務

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { roundId } = await req.json();
  const round = await prisma.sicBoRound.findUnique({ where: { id: roundId } });
  if (!round) {
    return NextResponse.json({ error: "ROUND_NOT_FOUND" }, { status: 404 });
  }

  // 取得對應房間的 meta
  const { meta } = await getOrRotateRound(round.room);

  // 轉成 number，避免 bigint + number 報錯
  const drawIntervalSec = Number(meta.drawIntervalSec ?? 0);
  const lockBeforeRollSec = Number(meta.lockBeforeRollSec ?? 0);

  const willLock =
    round.startedAt.getTime() + (drawIntervalSec - lockBeforeRollSec) * 1000;

  const locked = Date.now() >= willLock || round.phase !== "BETTING";
  if (locked) {
    return NextResponse.json({ error: "ROUND_LOCKED" }, { status: 400 });
  }

  // 在這裡加上退款邏輯
  // e.g. 把下注金額退回用戶 balance，寫 Ledger

  return NextResponse.json({ ok: true });
}
