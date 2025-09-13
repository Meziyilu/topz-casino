// lib/lotto-scheduler.ts
export const runtime = "nodejs";

import { readConfig, ensureOpenDraw, lockIfNeeded, drawIfDue, settleIfDrawn } from "@/services/lotto.service";

type SchedulerState = {
  timer?: ReturnType<typeof setInterval>;
  running: boolean;
  resetting: boolean; // ★ 新增：重製中
};

const g = globalThis as any;
if (!g.__LOTTO_SCHED__) {
  g.__LOTTO_SCHED__ = { running: false, resetting: false } as SchedulerState;
}
const state: SchedulerState = g.__LOTTO_SCHED__;

// 提供給 API 呼叫：設定/解除重製旗標
export function setResetting(on: boolean) {
  state.resetting = on;
}
export function isResetting() {
  return !!state.resetting;
}

async function tick() {
  if (state.resetting) return; // ★ 重製中，不做任何事
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
