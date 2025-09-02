// lib/utils.ts
// 常用小工具（無 any）

export function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

export function assert(cond: unknown, msg = "Assertion failed"): asserts cond {
  if (!cond) throw new Error(msg);
}

export function utcDayStart(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0));
}

export function taipeiDayStartUTC(d: Date) {
  // 以台北時區的當地 00:00:00 轉成 UTC
  // 台北 = UTC+8，這裡簡化固定 +8h；若你的環境需考慮 DST/動態，請改用 tz 庫。
  const local = new Date(d);
  const y = local.getUTCFullYear();
  const m = local.getUTCMonth();
  const day = local.getUTCDate();
  // 先用 UTC 的 16:00:00 (= T00:00 - 8h) 代表台北當地日界
  const t = new Date(Date.UTC(y, m, day, 16, 0, 0));
  return t;
}

export function safeInt(v: unknown, fallback = 0) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function toBigInt(v: number | bigint) {
  return typeof v === "bigint" ? v : BigInt(v);
}

export function parseBool(s: unknown, fallback = false) {
  if (typeof s === "boolean") return s;
  if (typeof s === "string") {
    const t = s.toLowerCase();
    if (t === "true" || t === "1") return true;
    if (t === "false" || t === "0") return false;
  }
  return fallback;
}
