// lib/baccarat.ts — multi-room deterministic baccarat, daily reset

export type RoomSec = 30 | 60 | 90;
export type Phase = "BETTING" | "REVEAL" | "SETTLED";

export type Card = { rank: number; suit: number };
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

// ---- 房間設定 ----
// 下注/揭曉/結算：按比例切分（50% / 33% / 17%）
export function splitPhases(total: number) {
  const bet = Math.max(10, Math.floor(total * 0.5));
  const reveal = Math.max(6, Math.floor(total * 0.33));
  const settle = Math.max(4, total - bet - reveal);
  return { bet, reveal, settle };
}

// 以台北當地日期「每日重置」局號（從 1 開始）
function taipeiNow(): Date {
  return new Date(Date.now());
}
function minutesSinceTaipeiMidnight(d: Date) {
  // 用當地時間（Node 預設可能是 UTC；不影響相對連續性）
  const t = new Date(d);
  return t.getHours() * 60 + t.getMinutes();
}
function secondsSinceTaipeiMidnight(d: Date) {
  const t = new Date(d);
  return t.getHours() * 3600 + t.getMinutes() * 60 + t.getSeconds();
}

export function roundNumberAt(date: Date, roomSec: RoomSec): number {
  const sec = secondsSinceTaipeiMidnight(date);
  return Math.floor(sec / roomSec) + 1; // 當日第幾局，從 1 開始
}

export function phaseAt(date: Date, roomSec: RoomSec): { phase: Phase; secLeft: number } {
  const { bet, reveal, settle } = splitPhases(roomSec);
  const pos = secondsSinceTaipeiMidnight(date) % roomSec; // 當前回合內的位置
  if (pos < bet) {
    return { phase: "BETTING", secLeft: bet - pos };
  } else if (pos < bet + reveal) {
    return { phase: "REVEAL", secLeft: bet + reveal - pos };
  } else {
    return { phase: "SETTLED", secLeft: roomSec - pos };
  }
}

// ---- 洗牌 / 發牌 ----
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
  if (rank === 1) return 1;
  if (rank >= 10) return 0;
  return rank;
}
function total(cards: Card[]): number {
  const s = cards.reduce((a, c) => a + cardValue(c.rank), 0);
  return s % 10;
}

export function dealFromSeed(round: number, roomSec: RoomSec): DealResult {
  // 用 (round, roomSec) 當種子，確保各房間獨立且可重現
  const rnd = mulberry32(round * 1103515245 + roomSec * 12345);
  const deck: Card[] = [];
  for (let r = 1; r <= 13; r++) for (let s = 0; s < 4; s++) deck.push({ rank: r, suit: s });
  shuffle(deck, rnd);

  const player: Card[] = [deck.pop()!, deck.pop()!];
  const banker: Card[] = [deck.pop()!, deck.pop()!];

  let pt = total(player);
  let bt = total(banker);
  const natural = pt >= 8 || bt >= 8;

  if (!natural) {
    let player3: Card | null = null;
    if (pt <= 5) {
      player3 = deck.pop()!;
      player.push(player3);
      pt = total(player);
    }
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
    if (bankerDraw) banker.push(deck.pop()!);
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

  return { playerCards: player, bankerCards: banker, playerTotal, bankerTotal, outcome,
    playerPair, bankerPair, anyPair, perfectPair };
}

export function recentRounds(n: number, refDate: Date, roomSec: RoomSec): number[] {
  const cur = roundNumberAt(refDate, roomSec);
  const perDay = Math.floor(24 * 3600 / roomSec);
  const arr: number[] = [];
  for (let i = 0; i < n; i++) {
    let r = cur - i;
    if (r <= 0) r += perDay;
    arr.push(r);
  }
  return arr;
}
