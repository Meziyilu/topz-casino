// lib/lotto.ts — Lotto 2.0 規則 / 賠率 / 工具（含 animationSec）
// ✅ 不使用 verifyJWT 泛型；純工具層

export type LottoConfig = {
  game: "6/49";
  /** 每期下注時間（秒）—結算完後下一期的 drawAt = now + drawIntervalSec */
  drawIntervalSec: number;      // 預設 300（5 分鐘）
  /** 封盤後到真正開獎（DRAW）的緩衝秒數，用來配合前端 20 秒動畫 */
  animationSec: number;         // 預設 20（秒）

  /** 玩法開關 */
  allowSpecialOddEven: boolean; // 特別號 單/雙
  allowSpecialBigSmall: boolean; // 特別號 大/小
  allowBallBigSmall: boolean;   // 各球 1~6 的 大/小/單/雙

  /** 下注限額 */
  minBet: number;
  maxBetPerTicket: number;
};

export const DEFAULT_LOTTO_CONFIG: LottoConfig = {
  game: "6/49",
  drawIntervalSec: 300,  // 5 分鐘一局
  animationSec: 20,      // 封盤後 20 秒動畫，之後才 DRAW
  allowSpecialOddEven: true,
  allowSpecialBigSmall: true,
  allowBallBigSmall: true,
  minBet: 10,
  maxBetPerTicket: 50_000,
};

export const LOTTO_CONFIG_KEY = "lotto.config";

export function pick6of49(): { numbers: number[]; special: number } {
  const pool = Array.from({ length: 49 }, (_, i) => i + 1);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const numbers = pool.slice(0, 6).sort((a, b) => a - b);
  const special = pool[6];
  return { numbers, special };
}

export const isOdd = (n: number) => (n & 1) === 1;
export const isBig = (n: number) => n >= 25; // 1..24 小、25..49 大

export function perBallAttr(n: number) {
  return {
    BIG: isBig(n),
    SMALL: !isBig(n),
    ODD: isOdd(n),
    EVEN: !isOdd(n),
  };
}

// —— 賠率（可再依商業調整，這裡給穩定可跑的數字）——
export const ODDS = {
  PICKS: { 3: 5, 4: 50, 5: 1_000, 6: 50_000 } as Record<number, number>,
  SPECIAL: { ODD: 1.9, EVEN: 1.9, BIG: 1.9, SMALL: 1.9 },
  BALL_ATTR: { BIG: 1.9, SMALL: 1.9, ODD: 1.9, EVEN: 1.9 } as Record<
    "BIG" | "SMALL" | "ODD" | "EVEN",
    number
  >,
};
