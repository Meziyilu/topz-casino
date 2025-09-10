"use client";

import { useMemo, useState } from "react";

type BetPayload =
  | { kind: "BIG_SMALL"; bigSmall: "BIG" | "SMALL"; amount: number }
  | { kind: "TOTAL"; totalSum: number; amount: number }
  | { kind: "SINGLE_FACE"; face: number; amount: number }
  | { kind: "DOUBLE_FACE"; face: number; amount: number }
  | { kind: "ANY_TRIPLE"; amount: number }
  | { kind: "SPECIFIC_TRIPLE"; face: number; amount: number }
  | { kind: "TWO_DICE_COMBO"; faceA: number; faceB: number; amount: number };

type BetCell = {
  key: string;
  title: string;
  odds: number | string;
  payload: Omit<BetPayload, "amount">;
  zone?: "BIG" | "SMALL" | null;
};

export default function SicboBoard({
  payoutTable,
  disabled,
  onBet,
  winKeys,
}: {
  payoutTable: any;     // from /state.config.payoutTable
  disabled: boolean;
  onBet: (b: BetPayload) => void;
  winKeys: Set<string>;
}) {
  const [chip, setChip] = useState(100);
  const odds = payoutTable;

  const bigSmall: BetCell[] = [
    { key: "BIG", title: "Big", odds: odds.bigSmall?.BIG ?? 1, payload: { kind: "BIG_SMALL", bigSmall: "BIG" }, zone: "BIG" },
    { key: "SMALL", title: "Small", odds: odds.bigSmall?.SMALL ?? 1, payload: { kind: "BIG_SMALL", bigSmall: "SMALL" }, zone: "SMALL" },
  ];

  const totals: BetCell[] = useMemo(() => {
    const arr: BetCell[] = [];
    Object.keys(odds.total || {})
      .map(Number)
      .sort((a, b) => a - b)
      .forEach((k) =>
        arr.push({
          key: `TOTAL_${k}`,
          title: String(k),
          odds: odds.total[k],
          payload: { kind: "TOTAL", totalSum: k },
        })
      );
    return arr;
  }, [odds]);

  const singles: BetCell[] = Array.from({ length: 6 }, (_, i) => i + 1).map((n) => ({
    key: `FACE_${n}`,
    title: `Face ${n}`,
    odds: "x1~x3",
    payload: { kind: "SINGLE_FACE", face: n },
  }));

  const doubles: BetCell[] = Array.from({ length: 6 }, (_, i) => i + 1).map((n) => ({
    key: `DBL_${n}`,
    title: `Double ${n}`,
    odds: odds.doubleFace ?? 8,
    payload: { kind: "DOUBLE_FACE", face: n },
  }));

  const triples: BetCell[] = [
    { key: "TRIPLE_ANY", title: "Any Triple", odds: odds.anyTriple ?? 24, payload: { kind: "ANY_TRIPLE" } },
    ...Array.from({ length: 6 }, (_, i) => i + 1).map((n) => ({
      key: `TRIPLE_${n}${n}${n}`,
      title: `Triple ${n}${n}${n}`,
      odds: odds.specificTriple ?? 150,
      payload: { kind: "SPECIFIC_TRIPLE", face: n },
    })),
  ];

  const combos: BetCell[] = [];
  for (let a = 1; a <= 5; a++)
    for (let b = a + 1; b <= 6; b++)
      combos.push({
        key: `COMBO_${a}_${b}`,
        title: `${a}-${b}`,
        odds: odds.twoDiceCombo ?? 5,
        payload: { kind: "TWO_DICE_COMBO", faceA: a, faceB: b },
      });

  const Cell = (b: BetCell) => (
    <button
      key={b.key}
      disabled={disabled}
      onClick={() => onBet({ ...(b.payload as any), amount: chip } as BetPayload)}
      className={`cell-btn ${
        b.zone === "BIG" ? "bigZone" : b.zone === "SMALL" ? "smallZone" : ""
      } ${winKeys.has(b.key) ? "win-flash" : ""}`}
      title={`Odds ${typeof b.odds === "number" ? `x${b.odds}` : String(b.odds)}`}
    >
      <div className="cell-title">{b.title}</div>
      <div className="cell-odds">{typeof b.odds === "number" ? `x${b.odds}` : b.odds}</div>
    </button>
  );

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {/* left: big/small + totals + singles */}
      <div className="glass p-3 space-y-3 rounded-lg">
        <div className="grid grid-cols-2 gap-3">{bigSmall.map(Cell)}</div>
        <div className="grid grid-cols-7 gap-3">{totals.map(Cell)}</div>
        <div className="text-sm opacity-80">Single Faces (1/2/3 dice = x1/x2/x3)</div>
        <div className="grid grid-cols-6 gap-3">{singles.map(Cell)}</div>
      </div>

      {/* right: doubles + triples + two-dice combos */}
      <div className="glass p-3 space-y-3 rounded-lg">
        <div className="grid grid-cols-6 gap-3">{doubles.map(Cell)}</div>
        <div className="grid grid-cols-7 gap-3">{triples.map(Cell)}</div>
        <div className="board-grid">{combos.map(Cell)}</div>
      </div>

      {/* chips */}
      <div className="glass p-3 col-span-full flex items-center gap-3 rounded-lg">
        {[10, 100, 1000, 5000, 10000].map((v) => (
          <button
            key={v}
            onClick={() => setChip(v)}
            className={`px-3 py-2 rounded ${chip === v ? "bg-white/20" : "hover:bg-white/10"}`}
          >
            {v}
          </button>
        ))}
        <div className="ml-auto text-sm opacity-80">Click any cell to bet (amount {chip})</div>
      </div>
    </div>
  );
}
