import { defaultPayoutTable } from "./odds";

export function analyze(d1:number,d2:number,d3:number){
  const sum = d1+d2+d3;
  const counts = {1:0,2:0,3:0,4:0,5:0,6:0} as Record<number,number>;
  [d1,d2,d3].forEach(v=>counts[v]++);
  const isTriple = (d1===d2 && d2===d3);
  const combos = new Set<string>();
  const faces = [d1,d2,d3].sort((a,b)=>a-b);
  [[faces[0],faces[1]],[faces[0],faces[2]],[faces[1],faces[2]]].forEach(([a,b])=> combos.add(`${a}_${b}`));
  return { sum, counts, isTriple, combos };
}

export type BetCheck =
  | { kind:"BIG_SMALL"; pick:"BIG"|"SMALL"; amount:number; odds:number }
  | { kind:"TOTAL"; sum:number; amount:number; odds:number }
  | { kind:"SINGLE_FACE"; face:number; amount:number; odds:number }
  | { kind:"DOUBLE_FACE"; face:number; amount:number; odds:number }
  | { kind:"ANY_TRIPLE"; amount:number; odds:number }
  | { kind:"SPECIFIC_TRIPLE"; face:number; amount:number; odds:number }
  | { kind:"TWO_DICE_COMBO"; a:number; b:number; amount:number; odds:number };

export function evaluate(bet: BetCheck, d1:number,d2:number,d3:number){
  const {sum,counts,isTriple,combos} = analyze(d1,d2,d3);
  const odds = bet.odds;
  switch(bet.kind){
    case "BIG_SMALL": {
      if (isTriple && defaultPayoutTable.bigSmall.tripleKills) return 0;
      const big = sum>=11 && sum<=17;
      const small = sum>=4 && sum<=10;
      if ((bet.pick==="BIG" && big) || (bet.pick==="SMALL" && small)) return Math.floor(bet.amount * odds);
      return 0;
    }
    case "TOTAL": return sum===bet.sum ? Math.floor(bet.amount * odds) : 0;
    case "SINGLE_FACE": {
      const c = counts[bet.face]||0;
      const multi = c===1? defaultPayoutTable.singleFace.one : c===2? defaultPayoutTable.singleFace.two : c===3? defaultPayoutTable.singleFace.three : 0;
      return multi>0 ? Math.floor(bet.amount * multi) : 0;
    }
    case "DOUBLE_FACE": return (counts[bet.face]||0)>=2 ? Math.floor(bet.amount * odds) : 0;
    case "ANY_TRIPLE": return isTriple ? Math.floor(bet.amount * odds) : 0;
    case "SPECIFIC_TRIPLE": return (isTriple && d1===bet.face) ? Math.floor(bet.amount * odds) : 0;
    case "TWO_DICE_COMBO": return combos.has(`${Math.min(bet.a,bet.b)}_${Math.max(bet.a,bet.b)}`) ? Math.floor(bet.amount * odds) : 0;
  }
}
