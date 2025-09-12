// app/api/admin/lotto/force-draw/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { drawNumbers, settleIfDrawn, readConfig, ensureOpenDraw } from "@/services/lotto.service";
import { startLottoScheduler, stopLottoScheduler, isSchedulerRunning } from "@/lib/lotto-scheduler";

export async function POST() {
  // 立即把 OPEN->LOCKED->DRAWN->SETTLED
  const cfg = await readConfig();
  await ensureOpenDraw(new Date(), cfg);

  const open = await prisma.lottoDraw.findFirst({ where: { status: "OPEN" }, orderBy: { drawAt: "asc" } });
  if (open) {
    await prisma.lottoDraw.update({ where: { id: open.id }, data: { status: "LOCKED" } });
  }
  const locked = await prisma.lottoDraw.findFirst({ where: { status: "LOCKED" }, orderBy: { drawAt: "asc" } });
  const { numbers, special } = drawNumbers(cfg.picksCount, cfg.pickMax);
  if (locked) {
    await prisma.lottoDraw.update({ where: { id: locked.id }, data: { status: "DRAWN", numbers, special } });
  }
  await settleIfDrawn();

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ running: isSchedulerRunning() });
}
