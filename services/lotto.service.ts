import prisma from '@/lib/prisma';
import { betPlaced, payout } from '@/services/ledger.service';

export async function currentDraw() {
  let d = await prisma.lottoDraw.findFirst({ where: { status: 'OPEN' }, orderBy: { drawAt: 'asc' } });
  if (!d) d = await prisma.lottoDraw.create({ data: { code: Math.floor(Math.random()*1e6), drawAt: new Date(Date.now()+20_000), numbers: [], status: 'OPEN' } });
  return d;
}

export async function placeLottoBet(userId: string, picks: number[], special: number | null, amount: number) {
  const d = await currentDraw();
  await betPlaced(userId, amount, undefined, undefined, {});
  return prisma.lottoBet.create({ data: { userId, drawId: d.id, picks, special: special ?? undefined, amount } });
}

export async function drawAndSettle(drawId: string) {
  const d = await prisma.lottoDraw.update({ where: { id: drawId }, data: { status: 'DRAWN', numbers: sampleNumbers(), special: Math.floor(Math.random()*10)+1 } });
  const bets = await prisma.lottoBet.findMany({ where: { drawId } });
  for (const b of bets) {
    const hits = b.picks.filter(x => d.numbers.includes(x)).length;
    const win = payoutByHits(hits, b.amount);
    if (win > 0) await payout(b.userId, win);
  }
  await prisma.lottoDraw.update({ where: { id: drawId }, data: { status: 'SETTLED' } });
  return d;
}

function sampleNumbers() {
  const arr = Array.from({ length: 49 }, (_, i) => i + 1);
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr.slice(0, 6).sort((a,b)=>a-b);
}

function payoutByHits(hits: number, base: number) {
  const table: Record<number, number> = { 3: 1.5, 4: 5, 5: 50, 6: 500 };
  const mul = table[hits] ?? 0;
  return Math.floor(base * mul);
}