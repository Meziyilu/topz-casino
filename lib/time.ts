// lib/time.ts
export function taipeiNow(): Date {
  // 服務端以 UTC 儲存；這裡只為了取現在時間點（Date 本身就 UTC）
  return new Date();
}

export function secUntil(target: Date, now = taipeiNow()): number {
  return Math.max(0, Math.floor((target.getTime() - now.getTime()) / 1000));
}
