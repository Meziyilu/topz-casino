// lib/time-window.ts
export type StatPeriod = "DAILY" | "WEEKLY";

// 將時間以 UTC 正規化
function atUtc(d: Date) { return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds())); }

export function currentWindow(period: StatPeriod) {
  const now = new Date();
  const utcNow = atUtc(now);

  if (period === "DAILY") {
    const start = new Date(Date.UTC(utcNow.getUTCFullYear(), utcNow.getUTCMonth(), utcNow.getUTCDate(), 0, 0, 0));
    const end   = new Date(Date.UTC(utcNow.getUTCFullYear(), utcNow.getUTCMonth(), utcNow.getUTCDate() + 1, 0, 0, 0));
    return { windowStart: start, windowEnd: end };
  } else {
    // WEEKLY：以週一 00:00:00 UTC 為起點
    const day = utcNow.getUTCDay() || 7; // 1..7 (週日=7)
    const monday = new Date(Date.UTC(utcNow.getUTCFullYear(), utcNow.getUTCMonth(), utcNow.getUTCDate() - (day - 1), 0, 0, 0));
    const nextMonday = new Date(Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate() + 7, 0, 0, 0));
    return { windowStart: monday, windowEnd: nextMonday };
  }
}
