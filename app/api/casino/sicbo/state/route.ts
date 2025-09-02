export const runtime = "nodejs"; export const revalidate = 0; export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ensureRooms, getRoomConfig, getRoomState } from "@/lib/sicbo/room";
import { verifyRequest } from "@/lib/jwt";

function bad(msg:string, code=400){ return NextResponse.json({ error: msg }, { status: code }); }

export async function GET(req: Request){
  const { searchParams } = new URL(req.url);
  const room = (searchParams.get("room") || "R60") as "R30"|"R60"|"R90";
  await ensureRooms();
  const s = getRoomState(room), cfg = getRoomConfig(room);
  if (!s || !cfg) return bad("ROOM_NOT_READY", 503);

  const auth = verifyRequest(req);
  let my:any = null;
  if (auth?.userId && s.roundId) {
    const lastBets = await prisma.sicboBet.findMany({ where: { userId: auth.userId, roundId: s.roundId }, orderBy: { placedAt: "desc" }, take: 50 });
    const me = await prisma.user.findUnique({ where: { id: auth.userId }, select: { balance:true }});
    my = { balance: me?.balance ?? 0, lastBets };
  }

  const history = await prisma.sicboRound.findMany({
    where: { room }, orderBy: { startsAt: "desc" }, take: 50,
    select: { daySeq:true, die1:true, die2:true, die3:true, sum:true, isTriple:true }
  });

  return NextResponse.json({
    room,
    serverTime: new Date().toISOString(),
    current: { roundId: s.roundId, day: s.day, daySeq: s.daySeq, phase: s.phase, startsAt: s.startsAt, locksAt: s.locksAt, settledAt: s.settledAt },
    config: { drawIntervalSec: cfg.drawIntervalSec, lockBeforeRollSec: cfg.lockBeforeRollSec, limits: cfg.limits, payoutTable: cfg.payout },
    exposure: s.exposure,
    history, my
  });
}
