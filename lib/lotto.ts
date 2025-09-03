// ==============================
// file: lib/lotto.ts
// ==============================
export type LottoConfig = {
picksCount: number; // 幾個號碼
pickMax: number; // 號碼最大值 (1..pickMax)
special?: boolean; // 是否有特別號
};


export function drawNumbers(cfg: LottoConfig): { numbers: number[]; special: number | null } {
const pool = Array.from({ length: cfg.pickMax }, (_, i) => i + 1);
const numbers: number[] = [];
while (numbers.length < cfg.picksCount && pool.length > 0) {
const idx = Math.floor(Math.random() * pool.length);
numbers.push(pool.splice(idx, 1)[0]);
}
numbers.sort((a, b) => a - b);
const special = cfg.special ? (pool.length ? pool[Math.floor(Math.random() * pool.length)] : null) : null;
return { numbers, special };
}


export function isBig(n: number, max: number): boolean { return n > Math.floor(max / 2); }
export function isOdd(n: number): boolean { return n % 2 === 1; }


export type LottoBet = {
numbers: number[]; // 玩家選號
special?: number | null; // 玩家特別號 (若有)
};


export type LottoResult = {
hitCount: number; // 中幾個
specialHit: boolean; // 特別號是否中
};


export function evaluateBet(bet: LottoBet, result: { numbers: number[]; special: number | null }): LottoResult {
const set = new Set(result.numbers);
const hit = bet.numbers.filter((n) => set.has(n)).length;
const specialHit = !!(result.special && bet.special && result.special === bet.special);
return { hitCount: hit, specialHit };
}