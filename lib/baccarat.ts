// lib/baccarat.ts

// —— 型別（對應你目前 Prisma 的 enum）——
export type BetSide = "PLAYER" | "BANKER" | "TIE" | "PLAYER_PAIR" | "BANKER_PAIR";
export type RoundOutcome = "PLAYER" | "BANKER" | "TIE";

export type DealtResult = {
  outcome: RoundOutcome;
  playerTotal: number;
  bankerTotal: number;
  playerPair: boolean;
  bankerPair: boolean;
  anyPair: boolean;
  perfectPair: boolean;
  playerCards: string[]; // e.g. ["AH","9D","5C"]
  bankerCards: string[];
};

// —— 賠率表（已包含返還本金，所以派彩用 amount * ratio）——
// 與你的派彩程式相容：win = floor(amount * ratio)
export const payoutRatio: Record<BetSide, number> = {
  PLAYER: 2.0,        // 閒 1:1（含本金）→ 2.0
  BANKER: 1.95,       // 莊 1:1 但抽 5%（含本金）→ 1.95
  TIE: 9.0,           // 和 8:1（含本金）→ 9.0
  PLAYER_PAIR: 12.0,  // 對子 11:1（含本金）→ 12.0
  BANKER_PAIR: 12.0,
};

// —— 牌組工具 ——

// 52 張牌：A..K × 四花色
const SUITS = ["S", "H", "D", "C"] as const;
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"] as const;

// 建立新牌堆
function newDeck(): string[] {
  const deck: string[] = [];
  for (const s of SUITS) {
    for (const r of RANKS) {
      deck.push(r + s); // e.g. "AS", "TD"
    }
  }
  // 簡單洗牌
  for (let i = deck.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function cardVal(rank: string): number {
  if (rank === "A") return 1;
  if (rank === "T" || rank === "J" || rank === "Q" || rank === "K") return 0;
  // "2".."9"
  return parseInt(rank, 10);
}

function handTotal(cards: string[]): number {
  const sum =
    cards.reduce((acc, c) => acc + cardVal(c[0]), 0) % 10;
  return sum;
}

function isPair(cards: string[]): boolean {
  return cards.length >= 2 && cards[0][0] === cards[1][0];
}

function isPerfectPair(cards: string[]): boolean {
  // 完美對：前兩張點數與花色都一致（實務上是「點數相同且花色顏色/花色條件」，
  // 這邊採「同 rank 同 suit」作為示意）
  return cards.length >= 2 && cards[0] === cards[1];
}

// —— 百家樂發牌與第三張牌規則（標準規則，簡化實作）——

/**
 * 依百家樂規則發一局：
 * - 閒、莊各兩張牌
 * - 若有 Natural 8/9，立即停牌
 * - 否則按 Player/Banker 規則判斷第三張牌
 * 回傳所有動畫/前端需要的資訊
 */
export function dealRound(): DealtResult {
  const deck = newDeck();

  const player: string[] = [deck.pop()!, deck.pop()!];
  const banker: string[] = [deck.pop()!, deck.pop()!];

  let pTotal = handTotal(player);
  let bTotal = handTotal(banker);

  // Natural 停牌
  if (pTotal >= 8 || bTotal >= 8) {
    return finalize(player, banker);
  }

  // 閒家第三張：小於等於 5 補一張
  let playerThird: string | null = null;
  if (pTotal <= 5) {
    playerThird = deck.pop()!;
    player.push(playerThird);
    pTotal = handTotal(player);
  }

  // 莊家第三張：依規則
  // 若閒沒補牌：莊 <=5 就補
  if (!playerThird) {
    if (bTotal <= 5) banker.push(deck.pop()!);
  } else {
    // 閒有補第三張時的莊家補牌表
    const pt = cardVal(playerThird[0]);
    if (bTotal <= 2) {
      banker.push(deck.pop()!);
    } else if (bTotal === 3 && pt !== 8) {
      banker.push(deck.pop()!);
    } else if (bTotal === 4 && (pt >= 2 && pt <= 7)) {
      banker.push(deck.pop()!);
    } else if (bTotal === 5 && (pt >= 4 && pt <= 7)) {
      banker.push(deck.pop()!);
    } else if (bTotal === 6 && (pt === 6 || pt === 7)) {
      banker.push(deck.pop()!);
    } // bTotal === 7 停牌
  }

  return finalize(player, banker);
}

function finalize(player: string[], banker: string[]): DealtResult {
  const pTotal = handTotal(player);
  const bTotal = handTotal(banker);

  let outcome: RoundOutcome;
  if (pTotal > bTotal) outcome = "PLAYER";
  else if (pTotal < bTotal) outcome = "BANKER";
  else outcome = "TIE";

  const playerPair = isPair(player);
  const bankerPair = isPair(banker);
  const anyPair = playerPair || bankerPair;
  const perfectPair = isPerfectPair(player) || isPerfectPair(banker);

  return {
    outcome,
    playerTotal: pTotal,
    bankerTotal: bTotal,
    playerPair,
    bankerPair,
    anyPair,
    perfectPair,
    playerCards: player,
    bankerCards: banker,
  };
}

// —— 與既有 API 相容：提供別名 ——
// 你的 state/route.ts 目前是 import { dealOneRound, payoutRatio } ...
// 這裡把 dealOneRound 指到 dealRound，無須改 API。
export const dealOneRound = dealRound;
