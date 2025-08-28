// lib/baccarat.ts
import type { BetSide, RoundOutcome } from "@prisma/client";

export type Card = { r: number; s: number }; // r:1..13, s:0..3
export type Shoe = Card[];

export function makeShoe(): Shoe {
  const shoe: Shoe = [];
  for (let d = 0; d < 6; d++) { // 6副牌，簡化
    for (let s = 0; s < 4; s++) {
      for (let r = 1; r <= 13; r++) shoe.push({ r, s });
    }
  }
  // 洗牌
  for (let i = shoe.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shoe[i], shoe[j]] = [shoe[j], shoe[i]];
  }
  return shoe;
}

export function cardVal(c: Card) {
  const r = c.r;
  if (r >= 10) return 0;
  return r === 1 ? 1 : r;
}

export function sumMod10(cards: Card[]) {
  return cards.reduce((acc, c) => acc + cardVal(c), 0) % 10;
}

export function isPair(cards: Card[]) {
  return cards.length >= 2 && cards[0].r === cards[1].r;
}

export function dealOneRound(shoe: Shoe) {
  // 簡化：每局重新抽，不跨局共用 shoe（避免持久化）
  const draw = (): Card => ({ r: Math.floor(Math.random() * 13) + 1, s: Math.floor(Math.random() * 4) });

  const p: Card[] = [draw(), draw()];
  const b: Card[] = [draw(), draw()];

  let pTotal = sumMod10(p);
  let bTotal = sumMod10(b);

  const natural = pTotal >= 8 || bTotal >= 8;
  if (!natural) {
    // 簡化第三張規則（接近、非完整真人規則）
    if (pTotal <= 5) {
      p.push(draw());
      pTotal = sumMod10(p);
    }
    if (bTotal <= 5) {
      b.push(draw());
      bTotal = sumMod10(b);
    }
  }

  let outcome: RoundOutcome;
  if (pTotal > bTotal) outcome = "PLAYER";
  else if (bTotal > pTotal) outcome = "BANKER";
  else outcome = "TIE";

  return {
    playerCards: p,
    bankerCards: b,
    playerTotal: pTotal,
    bankerTotal: bTotal,
    playerPair: isPair(p),
    bankerPair: isPair(b),
    anyPair: isPair(p) || isPair(b),
    perfectPair: isPair(p) && isPair(b),
    outcome,
  };
}

export function payoutRatio(side: BetSide, result: ReturnType<typeof dealOneRound>) {
  // 常見賠率（可依需求調整）
  switch (side) {
    case "PLAYER": return result.outcome === "PLAYER" ? 1.0 : (result.outcome === "TIE" ? 0 : -1);
    case "BANKER": return result.outcome === "BANKER" ? 0.95 : (result.outcome === "TIE" ? 0 : -1);
    case "TIE":    return result.outcome === "TIE" ? 8.0 : -1;
    case "PLAYER_PAIR": return result.playerPair ? 11.0 : -1;
    case "BANKER_PAIR": return result.bankerPair ? 11.0 : -1;
    default: return -1;
  }
}
