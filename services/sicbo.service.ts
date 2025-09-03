import prisma from '@/lib/prisma';
import { betPlaced, payout } from '@/services/ledger.service';
import { SicBoRoomCode, SicBoPhase, SicBoBetKind } from '@prisma/client';

export async function getCurrentRound(room: SicBoRoomCode) {
  let r = await prisma.sicBoRound.findFirst({ where: { room, phase: { in: ['BETTING', 'REVEALING'] } }, orderBy: { startedAt: 'desc' } });
  if (!r) r = await prisma.sicBoRound.create({ data: { room, phase: 'BETTING', dice: [] } });
  return r;
}

export async function placeBet(userId: string, room: SicBoRoomCode, kind: SicBoBetKind, amount: number, payload?: any) {
  const round = await getCurrentRound(room);
  if (round.phase !== 'BETTING') throw new Error('ROUND_LOCKED');
  await betPlaced(userId, amount, undefined, room, { sicboRoundId: round.id });
  return prisma.sicBoBet.create({ data: { userId, roundId: round.id, kind, amount, payload } });
}

export async function settle(roundId: string) {
  const dice = [d6(), d6(), d6()];
  const r = await prisma.sicBoRound.update({ where: { id: roundId }, data: { phase: 'SETTLED', dice, endedAt: new Date() } });
  const bets = await prisma.sicBoBet.findMany({ where: { roundId } });
  for (const b of bets) {
    const win = winAmount(b.kind, dice, b.amount, b.payload);
    if (win > 0) await payout(b.userId, win, undefined, r.room, { sicboRoundId: roundId });
  }
  return r;
}

function d6() { return Math.floor(Math.random() * 6) + 1; }

function winAmount(kind: SicBoBetKind, dice: number[], amt: number, payload?: any) {
  const sum = dice.reduce((a,b)=>a+b,0);
  switch (kind) {
    case 'BIG': return (sum >= 11 && sum <= 17 && !triple(dice)) ? Math.floor(amt * 2) : 0;
    case 'SMALL': return (sum >= 4 && sum <= 10 && !triple(dice)) ? Math.floor(amt * 2) : 0;
    case 'ODD': return sum % 2 === 1 ? Math.floor(amt * 2) : 0;
    case 'EVEN': return sum % 2 === 0 ? Math.floor(amt * 2) : 0;
    case 'ANY_TRIPLE': return triple(dice) ? amt * 31 : 0;
    case 'SPECIFIC_TRIPLE': return triple(dice) && payload?.value && dice[0] === payload.value ? amt * 181 : 0;
    case 'SPECIFIC_DOUBLE': return containsDouble(dice, payload?.value) ? amt * 11 : 0;
    case 'TOTAL': return totalOdds(sum) * amt;
    case 'COMBINATION': return containsPair(dice, payload?.a, payload?.b) ? amt * 6 : 0;
    case 'SINGLE_DIE': return countDie(dice, payload?.value) * amt * 2; // 1~3 倍簡化
    default: return 0;
  }
}

function triple(d: number[]) { return d[0] === d[1] && d[1] === d[2]; }
function containsPair(d: number[], a: number, b: number) { return d.includes(a) && d.includes(b) && a !== b; }
function containsDouble(d: number[], v: number) { return d.filter(x => x === v).length >= 2; }
function countDie(d: number[], v: number) { return d.filter(x => x === v).length; }
function totalOdds(sum: number) { const map: Record<number, number> = {4:50,5:18,6:14,7:12,8:8,9:6,10:6,11:6,12:6,13:8,14:12,15:14,16:18,17:50}; return map[sum] ?? 0; }