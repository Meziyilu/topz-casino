// lib/roulette/rng.ts
// 與你現有 RNG 一致的「可注入種子」設計；若沒設置則用當下時間
export function nextResult(seed?: number): { result: number; usedSeed: number } {
  const usedSeed = typeof seed === 'number' ? seed : Math.floor(Date.now() / 1000);
  // 極簡線性同餘生成 -> 0..36
  const a = 1664525, c = 1013904223, m = 2 ** 32;
  const x = (a * usedSeed + c) % m;
  return { result: x % 37, usedSeed };
}
