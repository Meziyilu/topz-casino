// lib/baccarat.ts
import type { BetSide, RoundOutcome } from "@prisma/client";

// 牌點（A=1，10/J/Q/K=0）
const rankPoints: Record<string, number> = {
  A: 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9,
  "10": 0, J: 0, Q: 0, K: 0,
};

const ranks = Object.keys(rankPoints);
const suits = ["♠", "♥", "♦", "♣"];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.random() * (i + 1) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function freshDeck() {
  const cards: { rank: string; suit: string }[] = [];
  for (const r of ranks) for (const s of suits) cards.push({ rank: r, suit: s });
  return shuffle(cards);
}

function total(cards: { rank: string }[]) {
  return cards.reduce((sum, c) => sum + rankPoints[c.rank], 0) % 10;
}

function playerNeeds3(pt: number) { return pt <= 5; }
function bankerNeeds3(bt: number, p3: number | null) {
  if (bt <= 2) return true;
  if (bt >= 7) return false;
  if (p3 === null) return bt <= 5;

  // 莊第三張規則
  if (bt === 3 && p3 !== 8) return true;
  if (bt === 4 && [2,3,4,5,6,7].includes(p3)) return true;
  if (bt === 5 && [4,5,6,7].includes(p3)) return true;
  if (bt === 6 && [6,7].includes(p3)) return true;
  return false;
}

export type DealResult = {
  outcome: RoundOutcome;
  playerTotal: number;
  bankerTotal: number;
  playerPair: boolean;
  bankerPair: boolean;
  anyPair: boolean;
  perfectPair: boolean;
  playerCards: { rank: string; suit: string }[];
  bankerCards: { rank: string; suit: string }[];
};

export function dealOneRound(): DealResult {
  let deck = freshDeck();

  const playerCards = [deck.pop()!, deck.pop()!];
  const bankerCards = [deck.pop()!, deck.pop()!];

  let pt = total(playerCards);
  let bt = total(bankerCards);

  // Natural 8/9 不補
  if (!(pt >= 8 || bt >= 8)) {
    // 閒補
    let p3: { rank: string; suit: string } | null = null;
    if (playerNeeds3(pt)) {
      p3 = deck.pop()!;
      playerCards.push(p3);
      pt = total(playerCards);
    }
    // 莊補
    const p3Point = p3 ? rankPoints[p3.rank] : null;
    if (bankerNeeds3(bt, p3Point)) {
      bankerCards.push(deck.pop()!);
      bt = total(bankerCards);
    }
  }

  let outcome: RoundOutcome = "TIE";
  if (pt > bt) outcome = "PLAYER";
  else if (bt > pt) outcome = "BANKER";

  const playerPair = playerCards[0].rank === playerCards[1].rank;
  const bankerPair = bankerCards[0].rank === bankerCards[1].rank;
  const anyPair = playerPair || bankerPair;
  const perfectPair = playerPair && bankerPair;

  return {
    outcome,
    playerTotal: pt,
    bankerTotal: bt,
    playerPair, bankerPair, anyPair, perfectPair,
    playerCards, bankerCards,
  };
}

// 標準賠率（可調）
export function payoutRatio(
  side: BetSide,
  result: {
    outcome: RoundOutcome;
    playerPair: boolean;
    bankerPair: boolean;
  }
): number {
  switch (side) {
    case "PLAYER":      return result.outcome === "PLAYER" ? 2.0  : 0.0; // 1:1
    case "BANKER":      return result.outcome === "BANKER" ? 1.95 : 0.0; // 1:1 抽5%
    case "TIE":         return result.outcome === "TIE"    ? 9.0  : 0.0; // 8:1
    case "PLAYER_PAIR": return result.playerPair           ? 12.0 : 0.0; // 11:1
    case "BANKER_PAIR": return result.bankerPair           ? 12.0 : 0.0; // 11:1
    default:            return 0.0;
  }
}
