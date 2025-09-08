// services/baccarat.engine.ts
// 真實百家樂：8 副牌、自然 8/9、Player 補牌 ≤ 5、Banker 依表補牌；同時計算各種 side bets（對子/完美對/任一對/超級6）

export type Suit = 'S'|'H'|'D'|'C';
export type Rank = 1|2|3|4|5|6|7|8|9|10|11|12|13; // 1:A 11:J 12:Q 13:K

export type Card = { rank: Rank; suit: Suit };
export type Outcome = 'PLAYER'|'BANKER'|'TIE';

export type RoundDetail = {
  player: Card[];
  banker: Card[];
  p: number;    // 閒點
  b: number;    // 莊點
  outcome: Outcome;
  flags: {
    playerPair: boolean;
    bankerPair: boolean;
    anyPair: boolean;
    perfectPair: boolean;
    super6: boolean; // 莊6獲勝
  }
};

// ===== 牌組與工具 =====
function newShoe(nDecks = 8): Card[] {
  const suits: Suit[] = ['S','H','D','C'];
  const ranks: Rank[] = [1,2,3,4,5,6,7,8,9,10,11,12,13];
  const shoe: Card[] = [];
  for (let d=0; d<nDecks; d++) {
    for (const s of suits) for (const r of ranks) shoe.push({ rank: r, suit: s });
  }
  // Fisher-Yates shuffle
  for (let i = shoe.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shoe[i], shoe[j]] = [shoe[j], shoe[i]];
  }
  return shoe;
}

function cardPoint(c: Card): number {
  if (c.rank >= 10) return 0; // 10/J/Q/K
  return c.rank;              // A=1, 2..9=n
}

function sumMod10(cards: Card[]): number {
  const s = cards.reduce((acc, c) => acc + cardPoint(c), 0);
  return s % 10;
}

function isPair(a?: Card, b?: Card): boolean {
  return !!(a && b && a.rank === b.rank);
}
function isPerfectPair(a?: Card, b?: Card): boolean {
  return !!(a && b && a.rank === b.rank && a.suit === b.suit);
}

// ===== 補牌規則 =====
/**
 * 百家樂補牌：
 * 1) 先發兩張：P1 B1 P2 B2
 * 2) 若任一方自然(8/9) → 停止補牌，比點勝負
 * 3) 否則 Player 先看點數：≤5 補一張；6/7 停。
 * 4) Banker 依表決定是否補第三張（看 Banker 兩張點數 + Player 第三張點數）
 */
export function dealBaccaratRound(): RoundDetail {
  const shoe = newShoe(8);
  const draw = () => shoe.shift()!;

  const player: Card[] = [draw(), draw()];
  const banker: Card[] = [draw(), draw()];

  let p = sumMod10(player);
  let b = sumMod10(banker);

  const natural = (p === 8 || p === 9 || b === 8 || b === 9);
  if (!natural) {
    // Player third card rule
    let playerThird: Card | undefined;
    if (p <= 5) {
      playerThird = draw();
      player.push(playerThird);
      p = sumMod10(player);
    }

    // Banker third card rule
    const bankerTotal = b;
    const playerThirdPoint = playerThird ? cardPoint(playerThird) : undefined;

    const bankerDraw = (() => {
      if (!playerThird) {
        // Player 不補第三張：Banker ≤5 補；6/7 停
        return bankerTotal <= 5;
      }
      // Player 有第三張：依表
      switch (bankerTotal) {
        case 0: case 1: case 2: return true;
        case 3: return playerThirdPoint !== 8;
        case 4: return playerThirdPoint !== undefined && (playerThirdPoint >= 2 && playerThirdPoint <= 7);
        case 5: return playerThirdPoint !== undefined && (playerThirdPoint >= 4 && playerThirdPoint <= 7);
        case 6: return playerThirdPoint !== undefined && (playerThirdPoint === 6 || playerThirdPoint === 7);
        default: return false; // 7 停；8/9 前面 natural 已處理
      }
    })();

    if (bankerDraw) {
      banker.push(draw());
      b = sumMod10(banker);
    } else {
      // banker 不補時，b 維持兩張和
      b = sumMod10(banker);
    }
  }

  // 勝負
  let outcome: Outcome = 'TIE';
  if (p > b) outcome = 'PLAYER';
  else if (b > p) outcome = 'BANKER';

  // side flags
  const playerPair = isPair(player[0], player[1]);
  const bankerPair = isPair(banker[0], banker[1]);
  const perfectPair = isPerfectPair(player[0], player[1]) || isPerfectPair(banker[0], banker[1]);
  const anyPair = playerPair || bankerPair;
  const super6 = (outcome === 'BANKER' && b === 6);

  return {
    player, banker, p, b, outcome,
    flags: { playerPair, bankerPair, anyPair, perfectPair, super6 }
  };
}
