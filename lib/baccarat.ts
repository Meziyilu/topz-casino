// lib/baccarat.ts
export type Suit = "S" | "H" | "D" | "C";
export type Rank = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K";
export type Card = `${Rank}${Suit}`;

export type Outcome = "PLAYER" | "BANKER" | "TIE";
export type BetSide = "PLAYER" | "BANKER" | "TIE" | "PLAYER_PAIR" | "BANKER_PAIR";

const RANKS: Rank[] = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
const SUITS: Suit[] = ["S","H","D","C"];

function valueOf(rank: Rank): number {
  if (rank === "A") return 1;
  if (rank === "10" || rank === "J" || rank === "Q" || rank === "K") return 0;
  return parseInt(rank, 10);
}
function total(cards: Card[]): number {
  const v = cards.reduce((s, c) => s + valueOf(c.replace(/[SHDC]/, "") as Rank), 0);
  return v % 10;
}
function mkShoe(): Card[] {
  // 1 副牌就夠了；要更多可改 6 或 8
  const oneDeck: Card[] = [];
  for (const s of SUITS) for (const r of RANKS) oneDeck.push(`${r}${s}` as Card);
  // 簡單洗牌
  for (let i = oneDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [oneDeck[i], oneDeck[j]] = [oneDeck[j], oneDeck[i]];
  }
  return oneDeck;
}

/** 依百家規則發牌，回傳完整結果（含是否需要第三張） */
export function dealBaccarat() {
  const shoe = mkShoe();

  // 初始牌
  const player: Card[] = [shoe.pop()!, shoe.pop()!];
  const banker: Card[] = [shoe.pop()!, shoe.pop()!];

  const pTotal2 = total(player);
  const bTotal2 = total(banker);

  // 天牌（8/9）直接停
  const natural = (pTotal2 >= 8) || (bTotal2 >= 8);

  let playerDrawn: Card | null = null;
  let bankerDrawn: Card | null = null;

  if (!natural) {
    // 閒方第三張規則
    if (pTotal2 <= 5) {
      playerDrawn = shoe.pop()!;
      player.push(playerDrawn);
    }
    const p3Val = playerDrawn ? valueOf(playerDrawn.replace(/[SHDC]/, "") as Rank) : null;

    // 莊方第三張規則
    const b2 = bTotal2;
    if (playerDrawn === null) {
      // 閒沒補牌，莊<=5 補
      if (b2 <= 5) {
        bankerDrawn = shoe.pop()!;
        banker.push(bankerDrawn);
      }
    } else {
      // 閒有補牌 → 依對照表
      // 參考標準表：
      //  b=0,1,2 → 補
      //  b=3 → 閒第三張 != 8 才補
      //  b=4 → 閒第三張在 2~7 補
      //  b=5 → 閒第三張在 4~7 補
      //  b=6 → 閒第三張在 6~7 補
      //  b=7 → 停
      const v = p3Val!;
      let doDraw = false;
      if (b2 <= 2) doDraw = true;
      else if (b2 === 3) doDraw = v !== 8;
      else if (b2 === 4) doDraw = v >= 2 && v <= 7;
      else if (b2 === 5) doDraw = v >= 4 && v <= 7;
      else if (b2 === 6) doDraw = v === 6 || v === 7;
      if (doDraw) {
        bankerDrawn = shoe.pop()!;
        banker.push(bankerDrawn);
      }
    }
  }

  const pTotal = total(player);
  const bTotal = total(banker);

  let outcome: Outcome = "TIE";
  if (pTotal > bTotal) outcome = "PLAYER";
  else if (bTotal > pTotal) outcome = "BANKER";

  return {
    player,
    banker,
    playerTotal: pTotal,
    bankerTotal: bTotal,
    outcome,
    playerPair: player[0].replace(/[SHDC]/,"") === player[1].replace(/[SHDC]/,""),
    bankerPair: banker[0].replace(/[SHDC]/,"") === banker[1].replace(/[SHDC]/,""),
    anyPair: false,             // 可依需求再計算更嚴謹
    perfectPair: false,
  };
}

/** 賠率（和 8:1；莊 0.95；閒 1:1；對子你可再擴充） */
export function payoutRatio(side: BetSide, result: { outcome: Outcome; playerPair?: boolean; bankerPair?: boolean }): number {
  if (side === "TIE") {
    return result.outcome === "TIE" ? 8 : 0;
  }
  if (side === "PLAYER") {
    return result.outcome === "PLAYER" ? 1 : 0;
  }
  if (side === "BANKER") {
    return result.outcome === "BANKER" ? 0.95 : 0;
  }
  if (side === "PLAYER_PAIR") return result.playerPair ? 11 : 0;
  if (side === "BANKER_PAIR") return result.bankerPair ? 11 : 0;
  return 0;
}
