// lib/baccarat.ts
export type Rank = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K";
export type Suit = "S" | "H" | "D" | "C"; // ♠♥♦♣
export type Card = { rank: Rank; suit: Suit };

export type RoundResult = {
  outcome: "PLAYER" | "BANKER" | "TIE";
  playerTotal: number;
  bankerTotal: number;
  playerPair: boolean;
  bankerPair: boolean;
  anyPair: boolean;
  perfectPair: boolean;
  playerCards: Card[];
  bankerCards: Card[];
};

// 0~51 洗牌，取前幾張映射成卡
function drawCards(n: number): Card[] {
  const ranks: Rank[] = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
  const suits: Suit[] = ["S","H","D","C"];
  // 簡易洗牌：用時間種子就好（不追求密碼學）
  const deck = Array.from({ length: 52 }, (_, i) => i);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor((Math.random() * 1000003) % (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck.slice(0, n).map((v) => ({
    rank: ranks[v % 13],
    suit: suits[Math.floor(v / 13)],
  }));
}

function cardValue(rank: Rank): number {
  if (rank === "A") return 1;
  if (["10","J","Q","K"].includes(rank)) return 0;
  return parseInt(rank, 10);
}
function total(cards: Card[]) {
  const s = cards.reduce((a, c) => a + cardValue(c.rank), 0);
  return s % 10;
}

// 依牌面判斷是否第三張（百家樂標準規則的簡化實作）
function shouldPlayerDraw(pTotal: number) {
  return pTotal <= 5;
}
function shouldBankerDraw(bTotal: number, playerThird?: Card) {
  // 簡化版：若閒有補第三張，依常見對應；未覆蓋全部細節，但足以動畫與點數演算
  if (playerThird) {
    const v = cardValue(playerThird.rank);
    if (bTotal <= 2) return true;
    if (bTotal === 3) return v !== 8;
    if (bTotal === 4) return v >= 2 && v <= 7;
    if (bTotal === 5) return v >= 4 && v <= 7;
    if (bTotal === 6) return v === 6 || v === 7;
    return false;
  } else {
    return bTotal <= 5;
  }
}

export function dealRound(): RoundResult {
  const seq = drawCards(6); // 先抓夠用的卡，實際依規則決定是否用到第 5/6 張
  const player: Card[] = [seq[0], seq[2]];
  const banker: Card[] = [seq[1], seq[3]];
  let p = total(player);
  let b = total(banker);

  // Natural 停牌
  if (p < 8 && b < 8) {
    let p3: Card | undefined;
    if (shouldPlayerDraw(p)) {
      p3 = seq[4];
      if (p3) player.push(p3);
      p = total(player);
    }
    if (shouldBankerDraw(b, p3)) {
      const b3 = seq[5];
      if (b3) banker.push(b3);
      b = total(banker);
    }
  }

  const outcome: "PLAYER" | "BANKER" | "TIE" =
    p > b ? "PLAYER" : p < b ? "BANKER" : "TIE";

  const playerPair = player.length >= 2 && player[0].rank === player[1].rank;
  const bankerPair = banker.length >= 2 && banker[0].rank === banker[1].rank;
  const anyPair = playerPair || bankerPair;
  const perfectPair =
    (player.length >= 2 && player[0].rank === player[1].rank && player[0].suit === player[1].suit) ||
    (banker.length >= 2 && banker[0].rank === banker[1].rank && banker[0].suit === banker[1].suit);

  return {
    outcome,
    playerTotal: p,
    bankerTotal: b,
    playerPair,
    bankerPair,
    anyPair,
    perfectPair,
    playerCards: player,
    bankerCards: banker,
  };
}

// 賠率表（下注金額 * 賠率 = 派彩），TIE 時非 TIE 注單退注（由 API 控制不扣不加）
export const payoutRatio: Record<
  "PLAYER" | "BANKER" | "TIE" | "PLAYER_PAIR" | "BANKER_PAIR",
  number
> = {
  PLAYER: 1.0,
  BANKER: 0.95,
  TIE: 8.0,
  PLAYER_PAIR: 11.0,
  BANKER_PAIR: 11.0,
};
