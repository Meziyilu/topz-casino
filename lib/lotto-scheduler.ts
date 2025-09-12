// lib/lotto-scheduler.ts
export const runtime = "nodejs";

import { readConfig, ensureOpenDraw, lockIfNeeded, drawIfDue, settleIfDrawn } from "@/services/lotto.service";

type SchedulerState = {
  timer?: NodeJS.Timer;
  running: boolean;
};

const g = globalThis as any;
if (!g.__LOTTO_SCHED__) {
  g.__LOTTO_SCHED__ = { running: false } as SchedulerState;
}
const state: SchedulerState = g.__LOTTO_SCHED__;

// 每秒滴答：確保有 OPEN、到點鎖盤、到點開獎、開過就結算
async function tick() {
  const now = new Date();
  const cfg = await readConfig();
  await ensureOpenDraw(now, cfg);
  await lockIfNeeded(now, cfg);
  await drawIfDue(now, cfg);
  await settleIfDrawn();
}

export function startLottoScheduler() {
  if (state.running) return;
  state.running = true;
  state.timer = setInterval(tick, 1000);
}

export function stopLottoScheduler() {
  if (state.timer) clearInterval(state.timer);
  state.timer = undefined;
  state.running = false;
}

export function isSchedulerRunning() {
  return !!state.running;
}
