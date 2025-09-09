// lib/baccarat-deal.ts（可選：若不想額外檔案，就直接貼到每個 route 開頭）

export type Outcome = "PLAYER" | "BANKER" | "TIE";
type SimpleCard = { r: number; s: number };
const point = (r: number) => (r >= 10 ? 0 : r === 1 ? 1 : r);

function rng(seedStr: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6D2B79F5;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const draw = (rand: () => number): SimpleCard => ({ r: Math.floor(rand() * 13) + 1, s: Math.floor(rand() * 4) });

export function dealBaccarat(seed: string) {
  const rand = rng(seed);
  const P: SimpleCard[] = [draw(rand), draw(rand)];
  const B: SimpleCard[] = [draw(rand), draw(rand)];
  const p2 = (point(P[0].r) + point(P[1].r)) % 10;
  const b2 = (point(B[0].r) + point(B[1].r)) % 10;

  let p3: SimpleCard | undefined;
  let b3: SimpleCard | undefined;

  // 簡化的第三張規則
  if (p2 <= 5) p3 = draw(rand);
  const pPts = (p2 + (p3 ? point(p3.r) : 0)) % 10;

  if (!p3) {
    if (b2 <= 5) b3 = draw(rand);
  } else {
    if (b2 <= 2) b3 = draw(rand);
    else if (b2 <= 6 && rand() < 0.5) b3 = draw(rand);
  }
  const bPts = (b2 + (b3 ? point(b3.r) : 0)) % 10;

  const outcome: Outcome = pPts === bPts ? "TIE" : pPts > bPts ? "PLAYER" : "BANKER";

  // 對子/完美對/任一對/超級6
  const sameRank = (a?: SimpleCard, b?: SimpleCard) => !!(a && b && a.r === b.r);
  const sameSuit = (a?: SimpleCard, b?: SimpleCard) => !!(a && b && a.s === b.s);
  const playerPair = sameRank(P[0], P[1]);
  const bankerPair = sameRank(B[0], B[1]);
  const perfectPair = (playerPair && sameSuit(P[0], P[1])) || (bankerPair && sameSuit(B[0], B[1]));
  const anyPair = playerPair || bankerPair;
  const super6 = outcome === "BANKER" && bPts === 6;

  return {
    outcome, pPts, bPts,
    flags: { playerPair, bankerPair, anyPair, perfectPair, super6 },
    cards: { player: [P[0], P[1], p3].filter(Boolean), banker: [B[0], B[1], b3].filter(Boolean) },
  };
}
