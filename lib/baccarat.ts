// lib/baccarat.ts
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

export type Phase = "BETTING" | "REVEAL" | "SETTLED";

/** 根據房間秒數自動拆配各階段時間（約 1/2, 1/3, 其餘） */
export function phaseSlices(durationSeconds: number) {
  const betting = Math.max(10, Math.floor(durationSeconds * 0.5));
  const reveal = Math.max(5, Math.floor(durationSeconds * (1 / 3)));
  const settled = Math.max(3, durationSeconds - betting - reveal);
  return { betting, reveal, settled };
}

/** 取「台北當地的當日 00:00」(以 UTC 儲存) 作為 day 基準 */
export function taipeiDayStartUTC(now = new Date()): Date {
  // UTC+8：把時間往前推 8 小時取 UTC midnight，再加回去
  const tzOffsetMs = 8 * 3600 * 1000;
  const shifted = new Date(now.getTime() + tzOffsetMs);
  const y = shifted.getUTCFullYear();
  const m = shifted.getUTCMonth();
  const d = shifted.getUTCDate();
  const utcMidnightShifted = Date.UTC(y, m, d, 0, 0, 0);
  return new Date(utcMidnightShifted - tzOffsetMs);
}

/** 回傳當前 phase 與倒數（依房間秒數） */
export function phaseAt(date: Date, durationSeconds: number): { phase: Phase; secLeft: number } {
  const { betting, reveal, settled } = phaseSlices(durationSeconds);
  const pos = Math.floor((date.getTime() / 1000) % durationSeconds); // 0..duration-1
  if (pos < betting) return { phase: "BETTING", secLeft: betting - pos };
  if (pos < betting + reveal) return { phase: "REVEAL", secLeft: betting + reveal - pos };
  return { phase: "SETTLED", secLeft: betting + reveal + settled - pos };
}

/** 計算當日第幾局（roundSeq：從 1 開始） */
export function roundSeqAt(date: Date, durationSeconds: number): number {
  const day0 = taipeiDayStartUTC(date).getTime();
  const elapsedSec = Math.floor((date.getTime() - day0) / 1000);
  return Math.floor(elapsedSec / durationSeconds) + 1;
}

/** 依 (roomCode + day(YYYYMMDD) + roundSeq) 產生穩定種子 */
function seedFrom(roomCode: string, day: Date, roundSeq: number): number {
  const y = day.getUTCFullYear();
  const m = day.getUTCMonth() + 1;
  const d = day.getUTCDate();
  const key = `${roomCode}:${y}${String(m).padStart(2, "0")}${String(d).padStart(2, "0")}:${roundSeq}`;
  let h = 2166136261 >>> 0; // FNV-1a
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

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

export function dealBy(roomCode: string, day: Date, roundSeq: number): DealResult {
  const seed = seedFrom(roomCode, day, roundSeq);
  const rnd = mulberry32(seed);
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

/** 最近 N 局（不跨日簡化） */
export function recentSeqs(n: number, roundSeq: number): number[] {
  const arr: number[] = [];
  for (let i = 0; i < n; i++) {
    const s = roundSeq - i;
    if (s >= 1) arr.push(s);
  }
  return arr;
}
