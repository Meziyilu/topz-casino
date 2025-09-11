// lib/sicbo.ts
import type { SicBoBetKind } from "@prisma/client";

export type Dice = [number, number, number];

export const TOTAL_PAYOUT: Record<number, number> = {
  4: 50, 17: 50,
  5: 18, 16: 18,
  6: 14, 15: 14,
  7: 12, 14: 12,
  8: 8,  13: 8,
  9: 6,  12: 6,
  10: 6, 11: 6,
};

export function isTriple(d: Dice): boolean {
  return d[0] === d[1] && d[1] === d[2];
}
export function sum(d: Dice): number { return d[0] + d[1] + d[2]; }

export function rollDice(seedStr?: string): Dice {
  // 可換成你既有 RNG；先簡單隨機
  const r = () => Math.floor(Math.random() * 6) + 1;
  return [r(), r(), r()] as Dice;
}

export function validatePayload(kind: SicBoBetKind, payload?: any): any {
  switch (kind) {
    case "BIG": case "SMALL": case "ODD": case "EVEN": case "ANY_TRIPLE":
      return null;
    case "TOTAL":
      if (!payload || typeof payload.total !== "number" || payload.total < 4 || payload.total > 17)
        throw new Error("INVALID_TOTAL");
      return { total: payload.total };
    case "SPECIFIC_TRIPLE":
      if (!payload || ![1,2,3,4,5,6].includes(payload.eye)) throw new Error("INVALID_TRIPLE");
      return { eye: payload.eye };
    case "SPECIFIC_DOUBLE":
      if (!payload || ![1,2,3,4,5,6].includes(payload.eye)) throw new Error("INVALID_DOUBLE");
      return { eye: payload.eye };
    case "COMBINATION":
      if (!payload) throw new Error("INVALID_COMBINATION");
      if (![1,2,3,4,5,6].includes(payload.a) || ![1,2,3,4,5,6].includes(payload.b) || payload.a === payload.b)
        throw new Error("INVALID_COMBINATION");
      return { a: payload.a, b: payload.b };
    case "SINGLE_DIE":
      if (!payload || ![1,2,3,4,5,6].includes(payload.eye)) throw new Error("INVALID_SINGLE");
      return { eye: payload.eye };
    default:
      throw new Error("INVALID_KIND");
  }
}

export function settleOne(kind: SicBoBetKind, amount: number, payload: any, dice: Dice) {
  const s = sum(dice);
  const triple = isTriple(dice);
  const countEye = (eye: number) => dice.filter(x => x === eye).length;

  switch (kind) {
    case "BIG":
      if (triple) return { win: false, payout: 0 };
      return s >= 11 && s <= 17 ? { win: true, payout: amount * 2 } : { win: false, payout: 0 };
    case "SMALL":
      if (triple) return { win: false, payout: 0 };
      return s >= 4 && s <= 10 ? { win: true, payout: amount * 2 } : { win: false, payout: 0 };
    case "ODD":
      if (triple) return { win: false, payout: 0 };
      return s % 2 === 1 ? { win: true, payout: amount * 2 } : { win: false, payout: 0 };
    case "EVEN":
      if (triple) return { win: false, payout: 0 };
      return s % 2 === 0 ? { win: true, payout: amount * 2 } : { win: false, payout: 0 };
    case "ANY_TRIPLE":
      return triple ? { win: true, payout: amount * 31 } : { win: false, payout: 0 };
    case "SPECIFIC_TRIPLE":
      return triple && dice[0] === payload.eye ? { win: true, payout: amount * 151 } : { win: false, payout: 0 };
    case "SPECIFIC_DOUBLE":
      return countEye(payload.eye) >= 2 ? { win: true, payout: amount * 9 } : { win: false, payout: 0 };
    case "TOTAL": {
      const mul = TOTAL_PAYOUT[payload.total];
      return s === payload.total ? { win: true, payout: amount * (mul + 1) } : { win: false, payout: 0 };
    }
    case "COMBINATION": {
      const hasA = countEye(payload.a) >= 1;
      const hasB = countEye(payload.b) >= 1;
      return hasA && hasB ? { win: true, payout: amount * 6 } : { win: false, payout: 0 };
    }
    case "SINGLE_DIE": {
      const c = countEye(payload.eye);
      if (c === 0) return { win: false, payout: 0 };
      return { win: true, payout: amount * (1 + c) }; // 1顆×2、2顆×3、3顆×4（含本金）
    }
  }
}
