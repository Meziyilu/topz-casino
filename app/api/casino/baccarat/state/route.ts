export const runtime = "nodejs"; export const dynamic = "force-dynamic";

import prisma from "@/lib/prisma";
import { getRoomConfig, calcTiming, dealBySeed, ensureCurrentRound } from "@/services/baccarat.service";
import { taipeiDayStartUTC } from "@/lib/utils";
import type { RoomCode } from "@prisma/client";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const room = (searchParams.get("room") as RoomCode) || "R60";
  const cfg = await getRoomConfig(room);

  // 房間關閉：維持介面但不可下注
  if (!cfg.enabled) {
    return Response.json({
      room: { code: room, name: `房間 ${room}`, durationSeconds: cfg.durationSeconds },
      day: taipeiDayStartUTC().toISOString(),
      roundId: null, roundSeq: 0, phase: "REVEALING", secLeft: 0,
      result: null, cards: { player: [], banker: [] }, myBets: {}, balance: null, recent: [],
      status: "CLOSED"
    }, { headers:{ "Cache-Control":"no-store" }});
  }

  const now = new Date();
  const t = calcTiming(room, cfg.durationSeconds, cfg.lockBeforeRevealSec, now);

  // 惰性建立當局
  let rnd = await ensureCurrentRound(room, t.startedAt);

  // 自動切相位（封盤 / 揭牌）
  if (t.locked && rnd.phase === "BETTING") {
    rnd = await prisma.round.update({ where:{ id: rnd.id }, data:{ phase: "REVEALING" } });
  }
  if (t.shouldReveal && rnd.phase !== "SETTLED") {
    rnd = await prisma.round.update({ where:{ id: rnd.id }, data:{ phase: "SETTLED", endedAt: now } });
  }

  // 用 seed 重建牌面與點數
  const seed = `${rnd.id}:${rnd.startedAt.toISOString()}`;
  const dealt = dealBySeed(seed);

  // 倒數
  const secLeft =
    rnd.phase === "BETTING" ? Math.max(0, Math.ceil((t.lockAt.getTime() - now.getTime()) / 1000)) :
    rnd.phase === "REVEALING" ? Math.max(0, Math.ceil((t.revealAt.getTime() - now.getTime()) / 1000)) : 0;

  // 近十局（用 endedAt 降序，再重建每局點數）
  const recentRounds = await prisma.round.findMany({
    where:{ room, phase: "SETTLED" },
    orderBy:{ endedAt:"desc" }, take: 20, select:{ id:true, startedAt:true }
  });
  const recent = recentRounds.map(r => {
    const d = dealBySeed(`${r.id}:${r.startedAt.toISOString()}`);
    return { roundSeq: 0, outcome: d.outcome, p: d.playerTotal, b: d.bankerTotal }; // 你的前端只顯示資料，不嚴格需要 seq
  });

  return Response.json({
    room: { code: room, name: `房間 ${room}`, durationSeconds: cfg.durationSeconds },
    day: t.day.toISOString(),
    roundId: rnd.id,
    roundSeq: 0, // 無 seq 欄位，以 0 佔位：前端只展示，不作查表
    phase: rnd.phase,
    secLeft,
    result: rnd.phase === "SETTLED" ? { outcome: dealt.outcome, p: dealt.playerTotal, b: dealt.bankerTotal } : null,
    cards: rnd.phase === "SETTLED"
      ? { player: dealt.playerCards, banker: dealt.bankerCards }
      : { player: [], banker: [] },
    myBets: {},   // 你的頁面會另外打 /my-bets，這裡給空即可
    balance: null,// 你的頁面會另外打 /users/me
    recent,
  }, { headers:{ "Cache-Control":"no-store" }});
}
