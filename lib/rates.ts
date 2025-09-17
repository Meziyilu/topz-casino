export const EXCHANGE_RATE = {
  WALLET_TO: { DIAMOND:300, TICKET:100, GACHA_TICKET:200 },
  TO_BANK: 350,
} as const;

export type FromTarget = "WALLET"|"BANK"|"DIAMOND"|"TICKET"|"GACHA_TICKET";
export type ToTarget   = "WALLET"|"BANK"|"DIAMOND"|"TICKET"|"GACHA_TICKET";

export function calcExchange(from: FromTarget, to: ToTarget, amount: number) {
  if (from === "WALLET" && (to === "DIAMOND" || to === "TICKET" || to === "GACHA_TICKET"))
    return amount * EXCHANGE_RATE.WALLET_TO[to];
  if ((from === "DIAMOND" || from === "TICKET" || from === "GACHA_TICKET") && to === "BANK")
    return amount * EXCHANGE_RATE.TO_BANK;
  return null;
}
