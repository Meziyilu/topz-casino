export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ensureCurrentRound, getLottoConfig, isLocked, drawNumbers, settleRound } from "@/lib/lotto";

export async function GET() {
  const { round, cfg } = await ensureCurrentRound();
  const now = new Date();

  // 到點尚未抽 → 抽號 (DRAWN)，供前端跑 ≥20s 動畫
  if (now.getTime() >= round.drawAt.getTime() && (round.status === "OPEN" || round.status === "LOCKED")) {
    const drawn = await prisma.lottoRound.update({
      where: { id: round.id, status: { in: ["OPEN","LOCKED"] } as any },
      data: { status: "DRAWN", ...drawNumbers(cfg.pickMax) }
    });
    return NextResponse.json(resp(drawn, cfg, now, true), { headers: noStore() });
  }

  // 已 DRAWN 且 ≥20s → 自動結算
  if (round.status === "DRAWN" && (now.getTime() - round.drawAt.getTime()) >= 20000) {
    const check = await prisma.lottoRound.findUnique({ where: { id: round.id } });
    if (check?.status === "DRAWN") await settleRound(round.id);
    const latest = await prisma.lottoRound.findUnique({ where: { id: round.id } });
    return NextResponse.json(resp(latest!, cfg, now, true), { headers: noStore() });
  }

  const locked = isLocked(now, round.drawAt, cfg.lockBeforeDrawSec);
  if (locked && round.status === "OPEN") {
    await prisma.lottoRound.update({ where: { id: round.id, status: "OPEN" }, data: { status: "LOCKED" } }).catch(()=>{});
  }
  return NextResponse.json(resp(round, cfg, now, locked), { headers: noStore() });
}

function resp(r:any, cfg:any, now:Date, locked:boolean){
  return {
    current: {
      id: r.id, code: r.code, drawAt: r.drawAt, status: r.status,
      numbers: r.numbers ?? [], special: r.special ?? null,
      pool: r.pool, jackpot: r.jackpot
    },
    config: cfg,
    serverTime: now.toISOString(),
    locked,
  };
}
function noStore(){ return {
  "Cache-Control":"no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  "Pragma":"no-cache","Expires":"0",
};}
