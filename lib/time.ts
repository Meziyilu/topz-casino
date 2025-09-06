// lib/time.ts
// 台北時間（UTC+8）當天 00:00:00 對應的 UTC 時刻
export function taipeiStartOfTodayUTC(base = new Date()): Date {
  const offsetMs = 8 * 60 * 60 * 1000; // UTC+8（台北無 DST）
  const tpe = new Date(base.getTime() + offsetMs);
  const startTpe = new Date(tpe.getFullYear(), tpe.getMonth(), tpe.getDate(), 0, 0, 0, 0);
  return new Date(startTpe.getTime() - offsetMs);
}
