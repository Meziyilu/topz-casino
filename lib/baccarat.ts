// lib/baccarat.ts
export type Suit = "S" | "H" | "D" | "C";
export type Card = { rank: number; suit: Suit };

export type DealResult = {
  playerCards: Card[];
  bankerCards: Card[];
  playerTotal: number;
  bankerTotal: number;
  outcome: "PLAYER" | "BANKER" | "TIE";
  playerPair: boolean;
  bankerPair: boolean;
  anyPair: boolean;
  perfectPair: boolean;
  usedNoCommission: boolean; // 莊6點勝
};

function freshDeck(): Card[] {
  const deck: Card[] = [];
  const suits: Suit[] = ["S", "H", "D", "C"];
  for (let s of suits) for (let r = 1; r <= 13; r++) deck.push({ rank: r, suit: s });
  return deck;
}

function shuffle<T>(xs: T[]): T[] {
  for (let i = xs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [xs[i], xs[j]] = [xs[j], xs[i]];
  }
  return xs;
}

function baccaratValue(rank: number) { return rank >= 10 ? 0 : rank; }
function handTotal(cards: Card[]) { return cards.reduce((a, c) => a + baccaratValue(c.rank), 0) % 10; }
function isPair(c1?: Card, c2?: Card) { return !!(c1 && c2 && c1.rank === c2.rank); }
function isPerfectPair(c1?: Card, c2?: Card) { return !!(c1 && c2 && c1.rank === c2.rank && c1.suit === c2.suit); }

export function dealRound(): DealResult {
  const deck = shuffle(freshDeck());
  const draw = () => deck.pop()!;
  const player: Card[] = [draw(), draw()];
  const banker: Card[] = [draw(), draw()];

  let playerFinal = [...player];
  let bankerFinal = [...banker];

  const pt = handTotal(playerFinal);
  const bt = handTotal(bankerFinal);

  // 自然 8/9
  if (!(pt >= 8 || bt >= 8)) {
    // 玩家第三張
    if (pt <= 5) playerFinal.push(draw());

    // 莊第三張（依玩家第三張）
    const p3 = playerFinal[2];
    const bt0 = handTotal(bankerFinal);
    if (p3 === undefined) {
      if (bt0 <= 5) bankerFinal.push(draw());
    } else {
      const p3v = baccaratValue(p3.rank);
      if (bt0 <= 2) bankerFinal.push(draw());
      else if (bt0 === 3 && p3v !== 8) bankerFinal.push(draw());
      else if (bt0 === 4 && p3v >= 2 && p3v <= 7) bankerFinal.push(draw());
      else if (bt0 === 5 && p3v >= 4 && p3v <= 7) bankerFinal.push(draw());
      else if (bt0 === 6 && (p3v === 6 || p3v === 7)) bankerFinal.push(draw());
    }
  }

  const playerTotal = handTotal(playerFinal);
  const bankerTotal = handTotal(bankerFinal);

  let outcome: "PLAYER" | "BANKER" | "TIE";
  if (playerTotal > bankerTotal) outcome = "PLAYER";
  else if (playerTotal < bankerTotal) outcome = "BANKER";
  else outcome = "TIE";

  return {
    playerCards: playerFinal,
    bankerCards: bankerFinal,
    playerTotal,
    bankerTotal,
    outcome,
    playerPair: isPair(player[0], player[1]),
    bankerPair: isPair(banker[0], banker[1]),
    anyPair: isPair(player[0], player[1]) || isPair(banker[0], banker[1]),
    perfectPair: isPerfectPair(player[0], player[1]) || isPerfectPair(banker[0], banker[1]),
    usedNoCommission: outcome === "BANKER" && bankerTotal === 6,
  };
}
