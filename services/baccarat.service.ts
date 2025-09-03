import prisma from '@/lib/prisma';
import { betPlaced, payout } from '@/services/ledger.service';
import { BetSide, RoomCode, RoundPhase, RoundOutcome } from '@prisma/client';

export async function getCurrentRound(room: RoomCode) {
  let r = await prisma.round.findFirst({ where: { room, phase: { in: [RoundPhase.BETTING, RoundPhase.REVEALING] } }, orderBy: { startedAt: 'desc' } });
  if (!r) r = await prisma.round.create({ data: { room, phase: RoundPhase.BETTING } });
  return r;
}

export async function placeBet(userId: string, room: RoomCode, side: BetSide, amount: number) {
  const round = await getCurrentRound(room);
  if (round.phase !== 'BETTING') throw new Error('ROUND_LOCKED');
  await betPlaced(userId, amount, room, undefined, { roundId: round.id });
  return prisma.bet.create({ data: { userId, roundId: round.id, side, amount } });
}

export async function listHistory(room: RoomCode, limit = 50) {
  return prisma.round.findMany({ where: { room, phase: RoundPhase.SETTLED }, orderBy: { startedAt: 'desc' }, take: limit });
}

export async function settleRound(roundId: string, outcome: RoundOutcome) {
  const round = await prisma.round.update({ where: { id: roundId }, data: { phase: RoundPhase.SETTLED, outcome, endedAt: new Date() } });
  const bets = await prisma.bet.findMany({ where: { roundId } });
  for (const b of bets) {
    const win = computePayout(outcome, b.side, b.amount);
    if (win > 0) await payout(b.userId, win, round.room, undefined, { roundId });
  }
  return round;
}

function computePayout(outcome: RoundOutcome, side: BetSide, amount: number) {
  const odds: Record<BetSide, number> = {
    PLAYER: 2.0, BANKER: 1.95, TIE: 8.0, PLAYER_PAIR: 11, BANKER_PAIR: 11, ANY_PAIR: 5, PERFECT_PAIR: 25, BANKER_SUPER_SIX: 12
  } as any;
  const win = match(outcome, side);
  return win ? Math.floor(amount * (odds[side] ?? 0)) : 0;
}

function match(outcome: RoundOutcome, side: BetSide) {
  if (side === 'PLAYER' && outcome === 'PLAYER') return true;
  if (side === 'BANKER' && outcome === 'BANKER') return true;
  if (side === 'TIE' && outcome === 'TIE') return true;
  // 其餘副注此處簡化為不命中；可擴充以實牌邏輯
  return false;
}