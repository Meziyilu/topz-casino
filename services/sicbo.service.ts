import { prisma } from "@/lib/prisma";
import { ensureRooms, getRoomConfig, getRoomState } from "@/lib/sicbo/room";
import type { RoomKey } from "@/lib/sicbo/types";

export default class SicboService {
  static async getState(room: RoomKey, userId?: string) {
    await ensureRooms();
    const s = getRoomState(room);
    const cfg = getRoomConfig(room);
    if (!s || !cfg) throw new Error("ROOM_NOT_READY");

    const history = await prisma.sicboRound.findMany({
      where: { room },
      orderBy: { startsAt: "desc" },
      take: 50,
      select: { daySeq: true, die1: true, die2: true, die3: true, sum: true, isTriple: true }
    });

    let my: null | { balance: number; lastBets: any[] } = null;
    if (userId && s.roundId) {
      const [me, bets] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId }, select: { balance: true } }),
        prisma.sicboBet.findMany({
          where: { userId, roundId: s.roundId },
          orderBy: { placedAt: "desc" },
          take: 20
        })
      ]);
      my = { balance: me?.balance ?? 0, lastBets: bets };
    }

    return {
      room,
      serverTime: new Date().toISOString(),
      current: {
        roundId: s.roundId, day: s.day, daySeq: s.daySeq, phase: s.phase,
        startsAt: s.startsAt, locksAt: s.locksAt, settledAt: s.settledAt
      },
      config: {
        drawIntervalSec: cfg.drawIntervalSec,
        lockBeforeRollSec: cfg.lockBeforeRollSec,
        limits: cfg.limits,
        payoutTable: cfg.payout
      },
      exposure: s.exposure,
      history,
      my
    };
  }
}
