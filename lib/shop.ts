export type VipPolicy = { [tier: number]: number };
export const defaultVipPolicy: VipPolicy = { 0:1.0, 1:0.98, 5:0.95, 10:0.9, 15:0.88, 20:0.85 };
export function pickVipRate(vipTier: number, policy: VipPolicy = defaultVipPolicy) {
  const keys = Object.keys(policy).map(Number).sort((a,b)=>a-b);
  let rate = 1.0; for (const k of keys) if (vipTier >= k) rate = policy[k]; return rate;
}
export function now(){ return new Date(); }
export function isOnSaleWindow(startAt?: Date|null, endAt?: Date|null, t=now()){
  if (startAt && t < startAt) return false; if (endAt && t > endAt) return false; return true;
}
export function symbolOf(c: "COIN"|"DIAMOND"|"TICKET"|"GACHA_TICKET"){ return c==="COIN"?"$":c==="DIAMOND"?"♦":c==="TICKET"?"🎫":"🌀"; }
export function formatUnit(n:number, c:"COIN"|"DIAMOND"|"TICKET"|"GACHA_TICKET"){ return c==="COIN"?`${symbolOf(c)}${(n/100).toFixed(2)}`:`${symbolOf(c)}${n}`; }
export function addDays(d: Date, days: number) { const x = new Date(d); x.setDate(x.getDate() + days); return x; }
