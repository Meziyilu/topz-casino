import { defaultPayoutTable } from "./odds";

export function analyze(d1: number, d2: number, d3: number) {
  const sum = d1 + d2 + d3;
  const counts = {1:0,2:0,3:0,4:0,5:0,6:0} as Record<number,number>;
  [d1,d2,d3].forEach(v=>counts[v]++);
  const isTriple = (d1===d2 && d2===d3);
  const combos = new Set<string>();
  const faces = [d1,d2,d3].sort((a,b)=>a-b);
  [[faces[0],faces[1]],[faces[0],faces[2]],[faces[1],faces[2]]]
    .forEach(([a,b])=> combos.add(`${a}_${b}`));
  return { sum, counts, isTriple, combos };
}
