// lib/roulette/payout.ts
import type { RouletteBetKind } from "@prisma/client";

/** ---------- 基本工具 ---------- **/

// 歐式輪盤紅色號碼（0 是綠）
const REDS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);

function isZero(n: number) { return n === 0; }
function isRed(n: number) { return REDS.has(n); }
function isBlack(n: number) { return n !== 0 && !REDS.has(n); }
function isOdd(n: number) { return n !== 0 && (n % 2 === 1); }
function isEven(n: number) { return n !== 0 && (n % 2 === 0); }
function isLow(n: number) { return n >= 1 && n <= 18; }
function isHigh(n: number) { return n >= 19 && n <= 36; }

function dozenIndex(n: number): 0 | 1 | 2 | -1 {
  if (n >= 1 && n <= 12) return 0;
  if (n >= 13 && n <= 24) return 1;
  if (n >= 25 && n <= 36) return 2;
  return -1; // 0 or invalid
}

function columnIndex(n: number): 0 | 1 | 2 | -1 {
  if (n === 0) return -1;
  // 1st column: 1,4,7,...,34; 2nd: 2,5,...,35; 3rd: 3,6,...,36
  const mod = n % 3;
  if (mod === 1) return 0;
  if (mod === 2) return 1;
  return 2; // mod === 0
}

// 驗證 numbers 內容在 0..36，且不重複
function validNumbers(arr: number[], minLen: number, maxLen: number) {
  if (!Array.isArray(arr)) return false;
  if (arr.length < minLen || arr.length > maxLen) return false;
  const s = new Set<number>();
  for (const n of arr) {
    if (!Number.isInteger(n) || n < 0 || n > 36) return false;
    if (s.has(n)) return false;
    s.add(n);
  }
  return true;
}

/** ---------- Payload 型別（可選：僅做說明） ---------- **/
type PayloadAny =
  | { numbers: number[] }                                     // STRAIGHT/SPLIT/STREET/CORNER/LINE 用
  | { dozen: 0 | 1 | 2 }                                      // DOZEN
  | { column: 0 | 1 | 2 }                                     // COLUMN
  | { color: "RED" | "BLACK" }                                // RED_BLACK
  | { parity: "ODD" | "EVEN" }                                // ODD_EVEN
  | { range: "LOW" | "HIGH" }                                 // LOW_HIGH
  | Record<string, unknown> | undefined;

/** ---------- 注型檢查 ---------- **/

const KINDS: Set<RouletteBetKind> = new Set([
  "STRAIGHT",
  "SPLIT",
  "STREET",
  "CORNER",
  "LINE",
  "DOZEN",
  "COLUMN",
  "RED_BLACK",
  "ODD_EVEN",
  "LOW_HIGH",
]);

export function isValidKind(kind: RouletteBetKind): boolean {
  return KINDS.has(kind);
}

/** ---------- 賠率計算（傳回倍數；0 = 未中） ---------- **/

export function payoutMultiplier(
  kind: RouletteBetKind,
  payload: PayloadAny,
  result: number
): number {
  // 安全：結果必須是 0..36 的整數
  if (!Number.isInteger(result) || result < 0 || result > 36) return 0;

  switch (kind) {
    /** 直接注：單號（包含 0），中 35:1 */
    case "STRAIGHT": {
      const nums = (payload as any)?.numbers as number[] | undefined;
      if (!validNumbers(nums ?? [], 1, 1)) return 0;
      return nums![0] === result ? 35 : 0;
    }

    /** 對注：兩號，17:1（0 也可與 1/2/3 做 split 不在此簡化範圍，給一般 2 號任意）*/
    case "SPLIT": {
      const nums = (payload as any)?.numbers as number[] | undefined;
      if (!validNumbers(nums ?? [], 2, 2)) return 0;
      return (nums!.includes(result)) ? 17 : 0;
    }

    /** 三號街：三號一排，11:1 */
    case "STREET": {
      const nums = (payload as any)?.numbers as number[] | undefined;
      if (!validNumbers(nums ?? [], 3, 3)) return 0;
      // 不強制檢查位置關係，交由前端產生合法「街」；後端只驗長度與範圍
      return (nums!.includes(result)) ? 11 : 0;
    }

    /** 角注（四個號），8:1 */
    case "CORNER": {
      const nums = (payload as any)?.numbers as number[] | undefined;
      if (!validNumbers(nums ?? [], 4, 4)) return 0;
      return (nums!.includes(result)) ? 8 : 0;
    }

    /** 線注（六個號），5:1 */
    case "LINE": {
      const nums = (payload as any)?.numbers as number[] | undefined;
      if (!validNumbers(nums ?? [], 6, 6)) return 0;
      return (nums!.includes(result)) ? 5 : 0;
    }

    /** 打（1~12 / 13~24 / 25~36），2:1；0 一律輸 */
    case "DOZEN": {
      const d = dozenIndex(result); // 0,1,2 或 -1
      const pick = (payload as any)?.dozen;
      if (pick !== 0 && pick !== 1 && pick !== 2) return 0;
      if (d === -1) return 0;
      return pick === d ? 2 : 0;
    }

    /** 列（column），2:1；0 一律輸 */
    case "COLUMN": {
      const c = columnIndex(result); // 0,1,2 或 -1
      const pick = (payload as any)?.column;
      if (pick !== 0 && pick !== 1 && pick !== 2) return 0;
      if (c === -1) return 0;
      return pick === c ? 2 : 0;
    }

    /** 紅黑，1:1；0 輸 */
    case "RED_BLACK": {
      const pick = (payload as any)?.color;
      if (pick !== "RED" && pick !== "BLACK") return 0;
      if (isZero(result)) return 0;
      return (pick === "RED" && isRed(result)) || (pick === "BLACK" && isBlack(result)) ? 1 : 0;
    }

    /** 單雙，1:1；0 輸 */
    case "ODD_EVEN": {
      const pick = (payload as any)?.parity;
      if (pick !== "ODD" && pick !== "EVEN") return 0;
      if (isZero(result)) return 0;
      return (pick === "ODD" && isOdd(result)) || (pick === "EVEN" && isEven(result)) ? 1 : 0;
    }

    /** 大小（1~18 / 19~36），1:1；0 輸 */
    case "LOW_HIGH": {
      const pick = (payload as any)?.range;
      if (pick !== "LOW" && pick !== "HIGH") return 0;
      if (isZero(result)) return 0;
      return (pick === "LOW" && isLow(result)) || (pick === "HIGH" && isHigh(result)) ? 1 : 0;
    }
  }

  return 0;
}
