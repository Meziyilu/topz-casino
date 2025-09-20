// lib/roulette/payout.ts
import { colorOf } from './colors';

export type BetKind =
  | 'RED' | 'BLACK' | 'ODD' | 'EVEN' | 'LOW' | 'HIGH'
  | 'DOZEN_1' | 'DOZEN_2' | 'DOZEN_3'
  | 'COLUMN_1' | 'COLUMN_2' | 'COLUMN_3'
  | `NUMBER_${number}`; // 0..36

export function isValidKind(kind: string): kind is BetKind {
  const BASIC = new Set([
    'RED','BLACK','ODD','EVEN','LOW','HIGH',
    'DOZEN_1','DOZEN_2','DOZEN_3',
    'COLUMN_1','COLUMN_2','COLUMN_3',
  ]);
  if (BASIC.has(kind)) return true;
  if (kind.startsWith('NUMBER_')) {
    const n = Number(kind.slice(7));
    return Number.isInteger(n) && n >= 0 && n <= 36;
  }
  return false;
}

const COLUMN_1 = new Set([1,4,7,10,13,16,19,22,25,28,31,34]);
const COLUMN_2 = new Set([2,5,8,11,14,17,20,23,26,29,32,35]);
const COLUMN_3 = new Set([3,6,9,12,15,18,21,24,27,30,33,36]);

export function payoutMultiplier(kind: BetKind, result: number): number {
  // Even-money 1:1
  if (kind === 'RED')  return colorOf(result) === 'RED'  ? 1 : 0;
  if (kind === 'BLACK')return colorOf(result) === 'BLACK'? 1 : 0;
  if (kind === 'ODD')  return result !== 0 && result % 2 === 1 ? 1 : 0;
  if (kind === 'EVEN') return result !== 0 && result % 2 === 0 ? 1 : 0;
  if (kind === 'LOW')  return result >= 1 && result <= 18 ? 1 : 0;
  if (kind === 'HIGH') return result >= 19 && result <= 36 ? 1 : 0;

  // Dozen 2:1
  if (kind === 'DOZEN_1') return result >= 1 && result <= 12 ? 2 : 0;
  if (kind === 'DOZEN_2') return result >= 13 && result <= 24 ? 2 : 0;
  if (kind === 'DOZEN_3') return result >= 25 && result <= 36 ? 2 : 0;

  // Column 2:1
  if (kind === 'COLUMN_1') return COLUMN_1.has(result) ? 2 : 0;
  if (kind === 'COLUMN_2') return COLUMN_2.has(result) ? 2 : 0;
  if (kind === 'COLUMN_3') return COLUMN_3.has(result) ? 2 : 0;

  // 直注 35:1
  if (kind.startsWith('NUMBER_')) {
    const n = Number(kind.slice(7));
    return n === result ? 35 : 0;
  }
  return 0;
}
