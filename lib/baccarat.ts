// lib/baccarat.ts
export type DealResult = {
  outcome: "PLAYER" | "BANKER" | "TIE";
  playerTotal: number;
  bankerTotal: number;
  playerPair: boolean;
  bankerPair: boolean;
  anyPair: boolean;
  perfectPair: boolean;
  playerCards: number[];
  bankerCards: number[];
};

// 0~9 的點數；簡化洗牌；可改成更擬真
function drawCard(): number {
  const r = Math.floor(Math.random() * 13) + 1; // 1~13
  if (r >= 10) return 0; // JQK = 0
  return r % 10;         // A=1, 2~9
}
function total(cards: number[]) {
  return cards.reduce((a, c) => a + c, 0) % 10;
}

export function dealOneRound(): DealResult {
  const p: number[] = [drawCard(), drawCard()];
  const b: number[] = [drawCard(), drawCard()];

  let pTotal = total(p);
  let bTotal = total(b);

  // 天生贏不補牌
  if (!(pTotal >= 8 || bTotal >= 8)) {
    // 玩家補牌規則
    if (pTotal <= 5) {
      p.push(drawCard());
      pTotal = total(p);
    }
    // 莊家補牌規則（簡化版）
    if (bTotal <= 5) {
      b.push(drawCard());
      bTotal = total(b);
    }
  }

  const outcome =
    pTotal > bTotal ? "PLAYER" : pTotal < bTotal ? "BANKER" : "TIE";

  const playerPair = p.length >= 2 && p[0] === p[1];
  const bankerPair = b.length >= 2 && b[0] === b[1];
  const anyPair = playerPair || bankerPair;
  const perfectPair =
    (playerPair && p[0] === p[1]) || (bankerPair && b[0] === b[1]); // 示意

  return {
    outcome,
    playerTotal: pTotal,
    bankerTotal: bTotal,
    playerPair,
    bankerPair,
    anyPair,
    perfectPair,
    playerCards: p,
    bankerCards: b,
  };
}

// 派彩倍率
export function payoutRatio(
  side: "PLAYER" | "BANKER" | "TIE" | "PLAYER_PAIR" | "BANKER_PAIR",
  result: DealResult
) {
  switch (side) {
    case "PLAYER": return result.outcome === "PLAYER" ? 1 : 0;
    case "BANKER": return result.outcome === "BANKER" ? 0.95 : 0; // 5% 抽水
    case "TIE":    return result.outcome === "TIE" ? 8 : 0;
    case "PLAYER_PAIR": return result.playerPair ? 11 : 0;
    case "BANKER_PAIR": return result.bankerPair ? 11 : 0;
    default: return 0;
  }
}
