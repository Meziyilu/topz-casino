// app/api/admin/lotto/scheduler/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { startLottoScheduler, stopLottoScheduler, isSchedulerRunning } from "@/lib/lotto-scheduler";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const action = body?.action as "start"|"stop";
  if (action === "start") startLottoScheduler();
  if (action === "stop") stopLottoScheduler();
  return NextResponse.json({ running: isSchedulerRunning() });
}

export async function GET() {
  return NextResponse.json({ running: isSchedulerRunning() });
}
