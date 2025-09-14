// lib/baccarat.ts
export type Side = "PLAYER" | "BANKER" | "TIE";
export type PairSide =
  | "PLAYER_PAIR"
  | "BANKER_PAIR"
  | "ANY_PAIR"
  | "PERFECT_PAIR"
  | "BANKER_SUPER_SIX";

export type DealResult = {
  shoe: number[];
  cards: {
    player: number[];
    banker: number[];
    playerThird?: number;
    bankerThird?: number;
  };
  total: { player: number; banker: number };
  outcome: Side;
  pairs: {
    playerPair: boolean;
    bankerPair: boolean;
    anyPair: boolean;
    perfectPair: boolean;
  };
  bankerSuperSix: boolean;
};

/* ===================== 時間與相位 ===================== */
export function taipeiDay(d = new Date()): string {
  const tz = "Asia/Taipei";
  const y = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric" }).format(d);
  const m = new Intl.DateTimeFormat("en-CA", { timeZone: tz, month: "2-digit" }).format(d);
  const dd = new Intl.DateTimeFormat("en-CA", { timeZone: tz, day: "2-digit" }).format(d);
  return `${y}${m}${dd}`;
}

export function nextPhases(
  now: Date,
  startedAt: Date,
  betSec = 30,
  revealSec = 8
): { phase: "BETTING" | "REVEALING" | "SETTLED"; locked: boolean; lockInSec: number; endInSec: number } {
  const startMs = startedAt.getTime();
  const lockAt = startMs + betSec * 1000;
  const endAt = lockAt + revealSec * 1000;
  const nowMs = now.getTime();

  const phase = nowMs < lockAt ? "BETTING" : nowMs < endAt ? "REVEALING" : "SETTLED";
  return {
    phase,
    locked: nowMs >= lockAt,
    lockInSec: Math.max(0, Math.ceil((lockAt - nowMs) / 1000)),
    endInSec: Math.max(0, Math.ceil((endAt - nowMs) / 1000)),
  };
}

/* ===================== 安全亂數與洗牌 ===================== */
// 在瀏覽器：globalThis.crypto.getRandomValues
// 在 Node：require('node:crypto').webcrypto.getRandomValues
function rand01(): number {
  try {
    const g: any = globalThis as any;
    const webc = g?.crypto?.getRandomValues
      ? g.crypto
      : // Node >= 16
        (require as any)?.("node:crypto")?.webcrypto;
    if (webc?.getRandomValues) {
      const u = new Uint32Array(1);
      webc.getRandomValues(u);
      return u[0] / 0xffffffff;
    }
  } catch {
    // ignore
  }
  return Math.random();
}

function fyShuffle<T>(arr: T[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand01() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** 建立 8 副牌（每張用 rank*100 + suit 表示，rank=1..13, suit=0..3） */
export function initShoe(): number[] {
  const one: number[] = [];
  for (let s = 0; s < 4; s++) for (let r = 1; r <= 13; r++) one.push(r * 100 + s);
  const shoe: number[] = [];
  for (let i = 0; i < 8; i++) shoe.push(...one);
  return fyShuffle(shoe);
}

function draw(shoe: number[]) {
  const x = shoe.pop();
  if (x === undefined) throw new Error("SHOE_EMPTY");
  return x;
}
const rankOf = (c: number) => Math.floor(c / 100); // 1..13
const suitOf = (c: number) => c % 100; // 0..3
const baccaratPoint = (r: number) => (r >= 10 ? 0 : r);
const handTotal = (cards: number[]) =>
  cards.reduce((a, c) => a + baccaratPoint(rankOf(c)), 0) % 10;
const isNatural = (p: number, b: number) => p >= 8 || b >= 8;

/* ===================== 發牌與補牌規則 ===================== */
export function dealRound(shoeIn: number[]): DealResult {
  let shoe = shoeIn.slice();
  if (shoe.length < 6) shoe = initShoe();

  const p: number[] = [draw(shoe), draw(shoe)];
  const b: number[] = [draw(shoe), draw(shoe)];
  let tp = handTotal(p);
  let tb = handTotal(b);

  if (!isNatural(tp, tb)) {
    // 閒先
    let p3: number | undefined;
    if (tp <= 5) {
      p3 = draw(shoe);
      p.push(p3);
      tp = handTotal(p);
    }

    // 莊依規則
    let b3: number | undefined;
    if (p3 === undefined) {
      if (tb <= 5) {
        b3 = draw(shoe);
        b.push(b3);
        tb = handTotal(b);
      }
    } else {
      const pt = baccaratPoint(rankOf(p3));
      const need =
        tb <= 2 ||
        (tb === 3 && pt !== 8) ||
        (tb === 4 && pt >= 2 && pt <= 7) ||
        (tb === 5 && pt >= 4 && pt <= 7) ||
        (tb === 6 && (pt === 6 || pt === 7));
      if (need) {
        b3 = draw(shoe);
        b.push(b3);
        tb = handTotal(b);
      }
    }
  }

  let outcome: Side = "TIE";
  if (tp > tb) outcome = "PLAYER";
  else if (tb > tp) outcome = "BANKER";

  const playerPair = rankOf(p[0]) === rankOf(p[1]);
  const bankerPair = rankOf(b[0]) === rankOf(b[1]);
  const anyPair = playerPair || bankerPair;
  const perfectPair =
    (playerPair && suitOf(p[0]) === suitOf(p[1])) ||
    (bankerPair && suitOf(b[0]) === suitOf(b[1]));

  const bankerSuperSix = outcome === "BANKER" && handTotal(b) === 6;

  return {
    shoe,
    cards: { player: p, banker: b, playerThird: p[2], bankerThird: b[2] },
    total: { player: tp, banker: tb },
    outcome,
    pairs: { playerPair, bankerPair, anyPair, perfectPair },
    bankerSuperSix,
  };
}

/* ===================== 派彩（回傳純派彩，不含本金） ===================== */
export function settleOne(
  bet: { side: Side | PairSide; amount: number },
  res: DealResult
): number {
  const a = bet.amount;

  switch (bet.side) {
    case "PLAYER":
      return res.outcome === "PLAYER" ? a * 1 : 0;
    case "BANKER":
      // 這裡採標準 0.95；若要「莊 6 點勝只賠 0.5」請改成 Math.floor(a * 0.5)。
      return res.outcome === "BANKER" ? Math.floor(a * 0.95) : 0;
    case "TIE":
      return res.outcome === "TIE" ? a * 8 : 0;

    case "PLAYER_PAIR":
      return res.pairs.playerPair ? a * 11 : 0;
    case "BANKER_PAIR":
      return res.pairs.bankerPair ? a * 11 : 0;
    case "ANY_PAIR":
      return res.pairs.anyPair ? a * 5 : 0;
    case "PERFECT_PAIR":
      return res.pairs.perfectPair ? a * 25 : 0;

    case "BANKER_SUPER_SIX":
      return res.bankerSuperSix ? a * 12 : 0;

    default:
      return 0;
  }
}
