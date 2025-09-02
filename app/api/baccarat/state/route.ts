export const runtime = "nodejs"; export const dynamic = "force-dynamic";

import prisma from "@/lib/prisma";
import { ensureRoom, getRoomConfig, calcTiming, dealRound } from "@/services/baccarat.service";
import { taipeiDayStartUTC } from "@/lib/utils";
import type { RoomCode } from "@prisma/client";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = (searchParams.get("room") as RoomCode) || "R60";
  const room = await ensureRoom(code);
  const cfg = await getRoomConfig(code);

  // 關房：前端維持介面但不可下注
  if (!room.enabled) {
    return Response.json({
      room: { code: room.code, name: room.name, durationSeconds: room.durationSeconds },
      day: taipeiDayStartUTC().toISOString(),
      roundId: null, roundSeq: 0, phase: "REVEALING", secLeft: 0,
      result: null, cards: { player: [], banker: [] },
      myBets: {}, balance: null, recent: [],
      status: "CLOSED"
    }, { headers: { "Cache-Control":"no-store" }});
  }

  const now = new Date();
  const t = calcTiming(code, cfg.durationSeconds, cfg.lockBeforeRevealSec, now);

  // 惰性建立/流轉
  let round = await prisma.round.findFirst({ where: { roomId: room.id, day: t.day, roundSeq: t.roundSeq } });
  if (!round) {
    round = await prisma.round.create({ data: {
      roomId: room.id, day: t.day, roundSeq: t.roundSeq, phase: "BETTING", startedAt: t.startedAt
    }});
  }
  if (t.shouldReveal && round.phase !== "SETTLED") {
    const dealt = dealRound();
    round = await prisma.round.update({
      where: { id: round.id },
      data: {
        phase: "SETTLED", settledAt: now,
        outcome: dealt.outcome as any,
        playerTotal: dealt.playerTotal, bankerTotal: dealt.bankerTotal,
        playerPair: dealt.playerPair, bankerPair: dealt.bankerPair,
        anyPair: dealt.anyPair, perfectPair: dealt.perfectPair,
        usedNoCommission: dealt.usedNoCommission,
        playerCards: dealt.playerCards as any, bankerCards: dealt.bankerCards as any,
      }
    });
  } else if (t.locked && round.phase === "BETTING") {
    round = await prisma.round.update({ where: { id: round.id }, data: { phase: "REVEALING" }});
  }

  const secLeft =
    round.phase === "BETTING" ? Math.max(0, Math.ceil((t.lockAt.getTime()-now.getTime())/1000)) :
    round.phase === "REVEALING" ? Math.max(0, Math.ceil((t.revealAt.getTime()-now.getTime())/1000)) : 0;

  // 近十局
  const recent = await prisma.round.findMany({
    where: { roomId: room.id, phase: "SETTLED" },
    orderBy: [{day:"desc"},{roundSeq:"desc"}], take: 20,
    select: { roundSeq:true, outcome:true, playerTotal:true, bankerTotal:true }
  });

  // 我的本局下注（匿名時回 0）
  // 你的 auth 在 lib/auth.ts，這裡簡化：不取用戶就回空
  const myBets = {} as Record<string, number>;

  return Response.json({
    room: { code: room.code, name: room.name, durationSeconds: cfg.durationSeconds },
    day: round.day.toISOString(),
    roundId: round.id, roundSeq: round.roundSeq,
    phase: round.phase,
    secLeft,
    result: round.outcome ? { outcome: round.outcome, p: round.playerTotal, b: round.bankerTotal } : null,
    cards: { player: round.playerCards ?? [], banker: round.bankerCards ?? [] },
    myBets,
    balance: null, // 你原本 /users/me 有回，前端會另外撈；或你在這裡帶出來也可
    recent: recent.map(r => ({ roundSeq: r.roundSeq, outcome: r.outcome!, p: r.playerTotal!, b: r.bankerTotal! })),
  }, { headers: { "Cache-Control":"no-store" }});
}
