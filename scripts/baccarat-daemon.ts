// scripts/baccarat-daemon.ts
import 'dotenv/config';
import { prisma } from '@/lib/prisma';
import type { RoomCode } from '@prisma/client';
import { getRoomInfo, getCurrentRound } from '@/services/baccarat.service';
import { dealBaccaratRound } from '@/services/baccarat.engine';
import { settleRoundWithDetail } from '@/services/baccarat.settlement';

const ROOMS: RoomCode[] = ['R30','R60','R90'];
const REVEAL_SECONDS = Number(process.env.BACCARAT_REVEAL_SECONDS ?? 2);
const LOOP_INTERVAL_MS = 1000;

const ms = (s:number)=>s*1000;
const now = ()=>new Date();

async function isPaused(room: RoomCode) {
  const key = `baccarat:${room}:paused`;
  const s = await prisma.setting.findUnique({ where: { key } });
  return s?.value === 'true';
}
async function startNewRound(room: RoomCode) {
  return prisma.round.create({ data: { room, phase:'BETTING', startedAt: now() } });
}
async function toRevealing(roundId: string) {
  await prisma.round.update({ where:{ id:roundId }, data:{ phase:'REVEALING', startedAt: now() } });
}

async function tickRoom(room: RoomCode) {
  if (await isPaused(room)) return;

  const rc = await getRoomInfo(room);
  const secondsPerRound = Number(rc.secondsPerRound ?? 60);

  let cur = await getCurrentRound(room);
  if (!cur) { await startNewRound(room); return; }

  if (cur.phase === 'BETTING') {
    const endBetAt = new Date(cur.startedAt.getTime() + ms(secondsPerRound));
    if (Date.now() >= endBetAt.getTime()) await toRevealing(cur.id);
    return;
  }

  if (cur.phase === 'REVEALING') {
    const endRevealAt = new Date(cur.startedAt.getTime() + ms(REVEAL_SECONDS));
    if (Date.now() >= endRevealAt.getTime()) {
      const detail = dealBaccaratRound();              // ← 真實發牌
      await settleRoundWithDetail(cur.id, detail);     // ← 正確派彩 + 存結果
    }
    return;
  }

  if (cur.phase === 'SETTLED') {
    await startNewRound(room); // 下一局
    return;
  }
}

async function main() {
  console.log('[daemon] baccarat auto loop started.');
  setInterval(async () => {
    try { for (const r of ROOMS) await tickRoom(r); }
    catch (e) { console.error('[daemon] tick error', e); }
  }, LOOP_INTERVAL_MS);
}
main().catch((e)=>{ console.error(e); process.exit(1); });
