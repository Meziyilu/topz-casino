// lib/baccarat.ts — deterministic baccarat engine (seeded by round)
export type Card = { rank: number; suit: number }; // rank: A=1..13, suit: 0..3
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
};

// ---- time / round phases ----
export type Phase = "BETTING" | "REVEAL" | "SETTLED";

/** Config：一局60秒：前30s下注、接著20s揭曉、最後10s結算/清場 */
export const ROUND_SECONDS = 60;
export const BETTING_SECONDS = 30;
export const REVEAL_SECONDS = 20;

export function nowTaipei(): Date {
  // Render 預設是 UTC；使用台北時區只影響 round 計算一致性（可換你要的時區習慣）
  return new Date(Date.now());
}

export function roundNumberAt(date: Date): number {
  // 以「UTC日內分鐘」計算，不跨日累加；你要每日 0001~1440 的效果
  const m = date.getUTCMinutes() + date.getUTCHours() * 60 + 1;
  return m; // 1..1440
}

export function phaseAt(date: Date): { phase: Phase; secLeft: number } {
  const sec = date.getUTCSeconds();
  const pos = sec % ROUND_SECONDS; // 0..59
  if (pos < BETTING_SECONDS) {
    return { phase: "BETTING", secLeft: BETTING_SECONDS - pos };
  } else if (pos < BETTING_SECONDS + REVEAL_SECONDS) {
    return { phase: "REVEAL", secLeft: BETTING_SECONDS + REVEAL_SECONDS - pos };
  } else {
    return { phase: "SETTLED", secLeft: ROUND_SECONDS - pos };
  }
}

// ---- RNG & dealing ----
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rnd: () => number) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function cardValue(rank: number): number {
  if (rank === 1) return 1; // A as 1 (baccarat)
  if (rank >= 10) return 0; // 10 J Q K
  return rank;              // 2..9
}

function total(cards: Card[]): number {
  const s = cards.reduce((a, c) => a + cardValue(c.rank), 0);
  return s % 10;
}

export function dealFromSeed(round: number): DealResult {
  // 用 round 當種子（+ 固定鹽），確保同一回合所有伺服器/客戶端結果一致
  const rnd = mulberry32(round * 9301 + 49297);
  const deck: Card[] = [];
  for (let r = 1; r <= 13; r++) for (let s = 0; s < 4; s++) deck.push({ rank: r, suit: s });
  shuffle(deck, rnd);

  const player: Card[] = [deck.pop()!, deck.pop()!];
  const banker: Card[] = [deck.pop()!, deck.pop()!];

  let pt = total(player);
  let bt = total(banker);

  // Natural
  const natural = pt >= 8 || bt >= 8;

  // third card rules
  if (!natural) {
    // Player third card
    let player3: Card | null = null;
    if (pt <= 5) {
      player3 = deck.pop()!;
      player.push(player3);
      pt = total(player);
    }
    // Banker third card (based on player's third)
    // Implement simplified but correct rules
    const b = bt;
    const p3 = player3 ? cardValue(player3.rank) : null;

    const bankerDraw =
      (player3 === null && bt <= 5) ||
      (player3 !== null &&
        ((b <= 2) ||
          (b === 3 && p3 !== 8) ||
          (b === 4 && p3! >= 2 && p3! <= 7) ||
          (b === 5 && p3! >= 4 && p3! <= 7) ||
          (b === 6 && (p3 === 6 || p3 === 7))));

    if (bankerDraw) {
      banker.push(deck.pop()!);
    }
  }

  const playerTotal = total(player);
  const bankerTotal = total(banker);
  const outcome = playerTotal > bankerTotal ? "PLAYER" : playerTotal < bankerTotal ? "BANKER" : "TIE";

  const playerPair = player[0].rank === player[1].rank;
  const bankerPair = banker[0].rank === banker[1].rank;
  const anyPair = playerPair || bankerPair;
  const perfectPair =
    (playerPair && player[0].suit === player[1].suit) ||
    (bankerPair && banker[0].suit === banker[1].suit);

  return {
    playerCards: player,
    bankerCards: banker,
    playerTotal,
    bankerTotal,
    outcome,
    playerPair,
    bankerPair,
    anyPair,
    perfectPair
  };
}

export function recentRounds(n: number, refDate: Date): number[] {
  const cur = roundNumberAt(refDate);
  const arr: number[] = [];
  for (let i = 0; i < n; i++) {
    let r = cur - i;
    if (r <= 0) r += 1440;
    arr.push(r);
  }
  return arr;
}
