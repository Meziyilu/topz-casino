// lib/roulette/colors.ts
export const RED_SET = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
export const BLACK_SET = new Set([2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35]);

export function colorOf(n: number): 'GREEN' | 'RED' | 'BLACK' {
  if (n === 0) return 'GREEN';
  if (RED_SET.has(n)) return 'RED';
  if (BLACK_SET.has(n)) return 'BLACK';
  return 'GREEN';
}
