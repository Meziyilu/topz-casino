// lib/roulette/payout.ts
import { Prisma, RouletteBetKind } from "@prisma/client";

/** ---------- 基本工具 ---------- **/
const REDS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
const isZero = (n: number) => n === 0;
const isRed = (n: number) => REDS.has(n);
const isBlack = (n: number) => n !== 0 && !REDS.has(n);
const isOdd = (n: number) => n !== 0 && n % 2 === 1;
const isEven = (n: number) => n !== 0 && n % 2 === 0;
const isLow = (n: number) => n >= 1 && n <= 18;
const isHigh = (n: number) => n >= 19 && n <= 36;

function dozenIndex(n: number): 0 | 1 | 2 | -1 {
  if (n >= 1 && n <= 12) return 0;
  if (n >= 13 && n <= 24) return 1;
  if (n >= 25 && n <= 36) return 2;
  return -1;
}
function columnIndex(n: number): 0 | 1 | 2 | -1 {
  if (n === 0) return -1;
  const mod = n % 3;
  if (mod === 1) return 0;
  if (mod === 2) return 1;
  return 2;
}
function validNumbers(arr: unknown, minLen: number, maxLen: number) {
  if (!Array.isArray(arr)) return false;
  if (arr.length < minLen || arr.length > maxLen) return false;
  const s = new Set<number>();
  for (const v of arr) {
    if (!Number.isInteger(v) || v < 0 || v > 36) return false;
    if (s.has(v)) return false;
    s.add(v);
  }
  return true;
}
function jvIsObj(v: Prisma.JsonValue): v is Prisma.JsonObject {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}
function jvGet(obj: Prisma.JsonValue | undefined, key: string): Prisma.JsonValue | undefined {
  if (!jvIsObj(obj)) return undefined;
  return obj[key];
}

/** ---------- 注型清單 ---------- **/
const KINDS: Set<RouletteBetKind> = new Set([
  "STRAIGHT","SPLIT","STREET","CORNER","LINE",
  "DOZEN","COLUMN","RED_BLACK","ODD_EVEN","LOW_HIGH",
]);

export function isValidKind(kind: RouletteBetKind): boolean {
  return KINDS.has(kind);
}

/** ---------- 賠率計算（回傳倍數；0 = 沒中） ---------- **/
export function payoutMultiplier(
  kind: RouletteBetKind,
  payload: Prisma.JsonValue,   // 這裡吃 Prisma.JsonValue
  result: number
): number {
  if (!Number.isInteger(result) || result < 0 || result > 36) return 0;

  switch (kind) {
    case "STRAIGHT": {
      const nums = jvGet(payload, "numbers");
      if (!validNumbers(nums, 1, 1)) return 0;
      return (nums as number[])[0] === result ? 35 : 0;
    }
    case "SPLIT": {
      const nums = jvGet(payload, "numbers");
      if (!validNumbers(nums, 2, 2)) return 0;
      return (nums as number[]).includes(result) ? 17 : 0;
    }
    case "STREET": {
      const nums = jvGet(payload, "numbers");
      if (!validNumbers(nums, 3, 3)) return 0;
      return (nums as number[]).includes(result) ? 11 : 0;
    }
    case "CORNER": {
      const nums = jvGet(payload, "numbers");
      if (!validNumbers(nums, 4, 4)) return 0;
      return (nums as number[]).includes(result) ? 8 : 0;
    }
    case "LINE": {
      const nums = jvGet(payload, "numbers");
      if (!validNumbers(nums, 6, 6)) return 0;
      return (nums as number[]).includes(result) ? 5 : 0;
    }
    case "DOZEN": {
      const d = dozenIndex(result);
      const pick = jvGet(payload, "dozen");
      if (pick !== 0 && pick !== 1 && pick !== 2) return 0;
      if (d === -1) return 0;
      return pick === d ? 2 : 0;
    }
    case "COLUMN": {
      const c = columnIndex(result);
      const pick = jvGet(payload, "column");
      if (pick !== 0 && pick !== 1 && pick !== 2) return 0;
      if (c === -1) return 0;
      return pick === c ? 2 : 0;
    }
    case "RED_BLACK": {
      const pick = jvGet(payload, "color");
      if (pick !== "RED" && pick !== "BLACK") return 0;
      if (isZero(result)) return 0;
      return (pick === "RED" && isRed(result)) || (pick === "BLACK" && isBlack(result)) ? 1 : 0;
    }
    case "ODD_EVEN": {
      const pick = jvGet(payload, "parity");
      if (pick !== "ODD" && pick !== "EVEN") return 0;
      if (isZero(result)) return 0;
      return (pick === "ODD" && isOdd(result)) || (pick === "EVEN" && isEven(result)) ? 1 : 0;
    }
    case "LOW_HIGH": {
      const pick = jvGet(payload, "range");
      if (pick !== "LOW" && pick !== "HIGH") return 0;
      if (isZero(result)) return 0;
      return (pick === "LOW" && isLow(result)) || (pick === "HIGH" && isHigh(result)) ? 1 : 0;
    }
  }
  return 0;
}
