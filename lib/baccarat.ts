// lib/baccarat.ts
// 完整百家樂發牌 + 賠率

export type Suit = "S" | "H" | "D" | "C";
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13; // A=1, J=11, Q=12, K=13
export type Card = { rank: Rank; suit: Suit };

export type RoundOutcome = "PLAYER" | "BANKER" | "TIE";
export type BetSide =
  | "PLAYER"
  | "BANKER"
  | "TIE"
  | "PLAYER_PAIR"
  | "BANKER_PAIR";

export type DealResult = {
  playerCards: Card[];
  bankerCards: Card[];
  playerTotal: number;
  bankerTotal: number;
  outcome: RoundOutcome;
  playerPair: boolean;
  bankerPair: boolean;
  anyPair: boolean;
  perfectPair: boolean; // 這邊定義為「兩邊皆首兩張同點同花色」→ 很罕見，通常為 25:1 或 200:1，各家不同。這裡不中用，先保留 false。
};

/** 建立 8 副牌的鞋（或 6 副也可），為簡化這裡用 6 副 */
function buildShoe(decks = 6): Card[] {
  const suits: Suit[] = ["S", "H", "D", "C"];
  const cards: Card[] = [];
  for (let d = 0; d < decks; d++) {
    for (const s of suits) {
      for (let r = 1 as Rank; r <= 13; r++) {
        cards.push({ rank: r as Rank, suit: s });
      }
    }
  }
  // 洗牌
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

function cardValue(c: Card): number {
  // A=1; 2-9=牌面; 10/J/Q/K=0
  if (c.rank === 1) return 1;
  if (c.rank >= 2 && c.rank <= 9) return c.rank;
  return 0;
}

function totalValue(cards: Card[]): number {
  const sum = cards.reduce((acc, c) => acc + cardValue(c), 0);
  return sum % 10;
}

/** 是否天然 8/9 */
function isNatural(cards: Card[]): boolean {
  const t = totalValue(cards);
  return cards.length === 2 && (t === 8 || t === 9);
}

/** 首兩張是否 pair（同點數） */
function isPair(cards: Card[]): boolean {
  if (cards.length < 2) return false;
  return cards[0].rank === cards[1].rank;
}

/** 銀行家第三張規則需要參考「閒家第三張」點數 */
function bankerDraws(banker: Card[], player: Card[]): boolean {
  const b = totalValue(banker);
  if (banker.length === 2 && player.length === 2) {
    // 玩家未補牌（Natural）
    if (isNatural(player) || isNatural(banker)) return false;
  }

  // 如果玩家有第三張，取第三張點數
  const playerThird = player[2] ? cardValue(player[2]) : null;

  if (banker.length >= 3) return false; // 已補第三張
  // 無玩家第三張：閒家未補牌，莊家 < 6 則補牌
  if (playerThird === null) return b <= 5;

  // 有玩家第三張：依莊家規則表
  if (b <= 2) return true;
  if (b === 3) return playerThird !== 8;
  if (b === 4) return playerThird >= 2 && playerThird <= 7;
  if (b === 5) return playerThird >= 4 && playerThird <= 7;
  if (b === 6) return playerThird === 6 || playerThird === 7;
  return false; // b=7 停牌；8/9 Natural 已處理
}

/** 發一局 */
export function dealRound(): DealResult {
  const shoe = buildShoe();
  const player: Card[] = [shoe.pop()!, shoe.pop()!];
  const banker: Card[] = [shoe.pop()!, shoe.pop()!];

  // Natural
  if (isNatural(player) || isNatural(banker)) {
    const pt = totalValue(player);
    const bt = totalValue(banker);
    return finalize(player, banker, pt, bt);
  }

  // 閒家先決定是否補第三張
  const pt2 = totalValue(player);
  if (pt2 <= 5) {
    player.push(shoe.pop()!);
  }

  // 莊家再依規則決定是否補
  if (bankerDraws(banker, player)) {
    banker.push(shoe.pop()!);
  }

  const pt = totalValue(player);
  const bt = totalValue(banker);
  return finalize(player, banker, pt, bt);
}

function finalize(player: Card[], banker: Card[], pt: number, bt: number): DealResult {
  let outcome: RoundOutcome = "TIE";
  if (pt > bt) outcome = "PLAYER";
  else if (bt > pt) outcome = "BANKER";

  const playerPair = isPair(player);
  const bankerPair = isPair(banker);
  const anyPair = playerPair || bankerPair;
  const perfectPair = false; // 先保留 false

  return {
    playerCards: player,
    bankerCards: banker,
    playerTotal: pt,
    bankerTotal: bt,
    outcome,
    playerPair,
    bankerPair,
    anyPair,
    perfectPair,
  };
}

/**
 * 賠率：回傳「乘數」
 * - PLAYER: 1
 * - BANKER: 0.95（抽 5% 抽水）
 * - TIE: 8
 * - PLAYER_PAIR / BANKER_PAIR: 11
 * - 其他：0
 * ※ 和局時：押 PLAYER/BANKER 需「退注」，請在 API 另外處理把本金退回。
 */
export function payoutRatio(
  side: BetSide,
  result: Pick<DealResult, "outcome" | "playerPair" | "bankerPair">
): number {
  if (side === "TIE") return result.outcome === "TIE" ? 8 : 0;
  if (side === "PLAYER") return result.outcome === "PLAYER" ? 1 : 0;
  if (side === "BANKER") return result.outcome === "BANKER" ? 0.95 : 0;
  if (side === "PLAYER_PAIR") return result.playerPair ? 11 : 0;
  if (side === "BANKER_PAIR") return result.bankerPair ? 11 : 0;
  return 0;
}
