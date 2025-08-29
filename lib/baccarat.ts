// lib/baccarat.ts
import type { BetSide, RoundOutcome } from "@prisma/client";

/** 一副 52 張，花色♠♥♦♣，點數 A,2..10,J,Q,K */
const SUITS = ["S", "H", "D", "C"] as const;
const RANKS = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"] as const;

type Card = { suit: string; rank: string; value: number };

function makeDeck(): Card[] {
  const deck: Card[] = [];
  for (const s of SUITS) {
    for (const r of RANKS) {
      const v =
        r === "A" ? 1 :
        r === "J" || r === "Q" || r === "K" || r === "10" ? 0 :
        parseInt(r, 10);
      deck.push({ suit: s, rank: r, value: v });
    }
  }
  return deck;
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function total(cards: Card[]) {
  return cards.reduce((acc, c) => acc + c.value, 0) % 10;
}

export type DealResult = {
  outcome: RoundOutcome;
  playerTotal: number;
  bankerTotal: number;
  playerPair: boolean;
  bankerPair: boolean;
  anyPair: boolean;
  perfectPair: boolean;
  playerCards: { suit: string; rank: string }[];
  bankerCards: { suit: string; rank: string }[];
};

/** 發一局（使用一副洗過的牌；不追蹤多副牌鞋） */
export function dealOneRound(): DealResult {
  let deck = shuffle(makeDeck());

  const player: Card[] = [deck.pop()!, deck.pop()!];
  const banker: Card[] = [deck.pop()!, deck.pop()!];

  let pTotal = total(player);
  let bTotal = total(banker);

  // Natural
  if (pTotal >= 8 || bTotal >= 8) {
    return finalize(player, banker);
  }

  // Player third card rule
  let playerThird: Card | null = null;
  if (pTotal <= 5) {
    playerThird = deck.pop()!;
    player.push(playerThird);
    pTotal = total(player);
  }

  // Banker third card rule
  let bankerThird: Card | null = null;
  if (!playerThird) {
    // If player stands
    if (bTotal <= 5) {
      bankerThird = deck.pop()!;
      banker.push(bankerThird);
      bTotal = total(banker);
    }
  } else {
    const pt = playerThird.value;
    if (bTotal <= 2) {
      bankerThird = deck.pop()!;
      banker.push(bankerThird);
      bTotal = total(banker);
    } else if (bTotal === 3 && pt !== 8) {
      bankerThird = deck.pop()!;
      banker.push(bankerThird);
      bTotal = total(banker);
    } else if (bTotal === 4 && pt >= 2 && pt <= 7) {
      bankerThird = deck.pop()!;
      banker.push(bankerThird);
      bTotal = total(banker);
    } else if (bTotal === 5 && pt >= 4 && pt <= 7) {
      bankerThird = deck.pop()!;
      banker.push(bankerThird);
      bTotal = total(banker);
    } else if (bTotal === 6 && (pt === 6 || pt === 7)) {
      bankerThird = deck.pop()!;
      banker.push(bankerThird);
      bTotal = total(banker);
    }
  }

  return finalize(player, banker);
}

function finalize(player: Card[], banker: Card[]): DealResult {
  const p = total(player);
  const b = total(banker);

  const outcome: RoundOutcome =
    p > b ? "PLAYER" : p < b ? "BANKER" : "TIE";

  const playerPair = player[0].rank === player[1].rank;
  const bankerPair = banker[0].rank === banker[1].rank;
  const anyPair = playerPair || bankerPair;
  const perfectPair =
    (playerPair && player[0].suit === player[1].suit) ||
    (bankerPair && banker[0].suit === banker[1].suit);

  return {
    outcome,
    playerTotal: p,
    bankerTotal: b,
    playerPair,
    bankerPair,
    anyPair,
    perfectPair,
    playerCards: player.map((c) => ({ suit: c.suit, rank: c.rank })),
    bankerCards: banker.map((c) => ({ suit: c.suit, rank: c.rank })),
  };
}

/** 派彩倍率（輸或不賠回 0） */
export function payoutRatio(side: BetSide, result: DealResult): number {
  switch (side) {
    case "PLAYER":
      return result.outcome === "PLAYER" ? 1 : 0;
    case "BANKER":
      return result.outcome === "BANKER" ? 0.95 : 0;
    case "TIE":
      return result.outcome === "TIE" ? 8 : 0;
    case "PLAYER_PAIR":
      return result.playerPair ? 11 : 0;
    case "BANKER_PAIR":
      return result.bankerPair ? 11 : 0;
    default:
      return 0;
  }
}
