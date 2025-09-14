// lib/baccarat.ts
export type Side = "PLAYER" | "BANKER" | "TIE";
export type PairSide = "PLAYER_PAIR" | "BANKER_PAIR" | "ANY_PAIR" | "PERFECT_PAIR" | "BANKER_SUPER_SIX";

export type DealResult = {
  shoe: number[]; // 派牌後剩餘的鞋（會被寫回 DB）
  cards: {
    player: number[];       // 閒最終持有（1~13，A=1, JQK=10）
    banker: number[];       // 莊最終持有
    playerThird?: number;   // 閒第三張（若有）
    bankerThird?: number;   // 莊第三張（若有）
  };
  total: { player: number; banker: number }; // 0~9
  outcome: Side;
  pairs: {
    playerPair: boolean;
    bankerPair: boolean;
    anyPair: boolean;
    perfectPair: boolean;   // 同點＋同花色：這裡用「同點＋同花色」= 25x（若只想同點＝完美對，可把花色判斷移除）
  };
  bankerSuperSix: boolean; // 莊以 6 點勝
};

/** ---------- 工具：時間與相位 ---------- */
export function taipeiDay(d = new Date()): string {
  // 台北當地 YYYYMMDD
  const tz = "Asia/Taipei";
  const y = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric" }).format(d);
  const m = new Intl.DateTimeFormat("en-CA", { timeZone: tz, month: "2-digit" }).format(d);
  const dd = new Intl.DateTimeFormat("en-CA", { timeZone: tz, day: "2-digit" }).format(d);
  return `${y}${m}${dd}`;
}

export function nextPhases(now: Date, startedAt: Date, betSec = 30, revealSec = 8) {
  const startMs = startedAt.getTime();
  const lockAt = startMs + betSec * 1000;           // 鎖注點
  const endAt = lockAt + revealSec * 1000;          // 本局終點
  const nowMs = now.getTime();

  const locked = nowMs >= lockAt;
  const phase: "BETTING" | "REVEALING" | "SETTLED" =
    nowMs < lockAt ? "BETTING" : nowMs < endAt ? "REVEALING" : "SETTLED";

  return {
    phase,
    locked,
    lockInSec: Math.max(0, Math.ceil((lockAt - nowMs) / 1000)),
    endInSec: Math.max(0, Math.ceil((endAt - nowMs) / 1000)),
  };
}

/** ---------- 洗牌/點數 ---------- */
function rand32() {
  if (typeof crypto !== "undefined" && (crypto as any).getRandomValues) {
    const u = new Uint32Array(1);
    (crypto as any).getRandomValues(u);
    return u[0] / 0xffffffff;
  }
  return Math.random();
}

function fyShuffle<T>(arr: T[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand32() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** 建立 8 副牌的鞋（52*8 = 416 張），以 1~13 表示點數，花色 0~3 */
export function initShoe(): number[] {
  const singleDeck: number[] = [];
  for (let suit = 0; suit < 4; suit++) {
    for (let rank = 1; rank <= 13; rank++) {
      // 用 100*rank + suit 表示一張牌，方便之後判斷「完美對（同點＋同花）」
      singleDeck.push(rank * 100 + suit);
    }
  }
  // 八副牌
  const shoe: number[] = [];
  for (let i = 0; i < 8; i++) shoe.push(...singleDeck);
  return fyShuffle(shoe);
}

function rankOf(card: number) {
  return Math.floor(card / 100); // 1~13
}
function suitOf(card: number) {
  return card % 100; // 0~3
}

function baccaratPoint(rank: number) {
  if (rank >= 10) return 0; // 10,J,Q,K 都是 0
  return rank;              // A=1, 2..9
}

function handTotal(cards: number[]) {
  const sum = cards.reduce((a, c) => a + baccaratPoint(rankOf(c)), 0);
  return sum % 10; // 0~9
}

function natural(totalP: number, totalB: number) {
  return totalP >= 8 || totalB >= 8;
}

/** ---------- 發牌 + 第三張規則 ---------- */
function draw(shoe: number[]) {
  const x = shoe.pop();
  if (x === undefined) throw new Error("SHOE_EMPTY");
  return x;
}

export function dealRound(shoeIn: number[]): DealResult {
  let shoe = shoeIn.slice();
  if (shoe.length < 6) shoe = initShoe(); // 保底：剩太少直接洗新鞋

  // 起手各兩張
  const p: number[] = [draw(shoe), draw(shoe)];
  const b: number[] = [draw(shoe), draw(shoe)];

  let totalP = handTotal(p);
  let totalB = handTotal(b);

  // 自然勝：一方 8/9 → 不補牌
  if (!natural(totalP, totalB)) {
    // 閒先決定
    let playerThird: number | undefined;
    if (totalP <= 5) {
      playerThird = draw(shoe);
      p.push(playerThird);
      totalP = handTotal(p);
    }

    // 莊家規則（依據閒第三張）
    let bankerThird: number | undefined;
    if (playerThird === undefined) {
      // 閒沒補：莊 <=5 補
      if (totalB <= 5) {
        bankerThird = draw(shoe);
        b.push(bankerThird);
        totalB = handTotal(b);
      }
    } else {
      const pt = baccaratPoint(rankOf(playerThird));
      // 標準規則表
      const needDraw =
        (totalB <= 2) ||
        (totalB === 3 && pt !== 8) ||
        (totalB === 4 && pt >= 2 && pt <= 7) ||
        (totalB === 5 && pt >= 4 && pt <= 7) ||
        (totalB === 6 && (pt === 6 || pt === 7));
      if (needDraw) {
        bankerThird = draw(shoe);
        b.push(bankerThird);
        totalB = handTotal(b);
      }
    }
  }

  // 結果
  let outcome: Side = "TIE";
  if (totalP > totalB) outcome = "PLAYER";
  else if (totalB > totalP) outcome = "BANKER";

  // 對子 & 完美對
  const playerPair = rankOf(p[0]) === rankOf(p[1]);
  const bankerPair = rankOf(b[0]) === rankOf(b[1]);
  const anyPair = playerPair || bankerPair;
  const perfectPair = (rankOf(p[0]) === rankOf(p[1]) && suitOf(p[0]) === suitOf(p[1]))
                   || (rankOf(b[0]) === rankOf(b[1]) && suitOf(b[0]) === suitOf(b[1]));

  const bankerSuperSix = outcome === "BANKER" && handTotal(b) === 6;

  return {
    shoe,
    cards: {
      player: p,
      banker: b,
      playerThird: p[2],
      bankerThird: b[2],
    },
    total: { player: totalP, banker: totalB },
    outcome,
    pairs: { playerPair, bankerPair, anyPair, perfectPair },
    bankerSuperSix,
  };
}

/** ---------- 結算（回傳純派彩，不含本金） ---------- */
export function settleOne(
  bet: { side: Side | PairSide; amount: number },
  res: DealResult
): number {
  const a = bet.amount;
  // 和局：閒/莊押注退還本金（這部分通常在外面處理；這裡只算派彩=0）
  if (bet.side === "PLAYER") {
    if (res.outcome === "PLAYER") return a * 1; // 1:1
    return 0;
  }
  if (bet.side === "BANKER") {
    if (res.outcome === "BANKER") {
      // 超六版本：若莊 6 點勝 → 1:0.5 或 1:0.95 視規則；這裡採 0.95，另有「莊超六」另算 12x
      return res.bankerSuperSix ? Math.floor(a * 0.95) : Math.floor(a * 0.95);
    }
    return 0;
  }
  if (bet.side === "TIE") {
    if (res.outcome === "TIE") return a * 8; // 8:1
    return 0;
  }
  if (bet.side === "PLAYER_PAIR") return res.pairs.playerPair ? a * 11 : 0;
  if (bet.side === "BANKER_PAIR") return res.pairs.bankerPair ? a * 11 : 0;
  if (bet.side === "ANY_PAIR")    return res.pairs.anyPair    ? a * 5  : 0;
  if (bet.side === "PERFECT_PAIR")return res.pairs.perfectPair? a * 25 : 0;
  if (bet.side === "BANKER_SUPER_SIX") return res.bankerSuperSix ? a * 12 : 0;
  return 0;
}
