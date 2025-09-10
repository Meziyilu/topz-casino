"use client";

import { useMemo, useState } from "react";

type BetPayload = any;

export default function SicboBoard({
  payoutTable,
  disabled,
  onBet,
  winKeys,
}: {
  payoutTable: any;
  disabled: boolean;
  onBet: (b: BetPayload) => void;
  winKeys: Set<string>;
}) {
  const [chip, setChip] = useState(100);
  const odds = payoutTable;

  const bigSmall = [
    { key: "BIG", title: "婢?, odds: odds.bigSmall.BIG, payload: { kind: "BIG_SMALL", bigSmall: "BIG" } },
    { key: "SMALL", title: "鐏?, odds: odds.bigSmall.SMALL, payload: { kind: "BIG_SMALL", bigSmall: "SMALL" } },
  ];

  const totals = useMemo(() => {
    return Object.keys(odds.total).map((k) => ({
      key: `TOTAL_${k}`,
      title: k,
      odds: odds.total[k],
      payload: { kind: "TOTAL", totalSum: Number(k) },
    }));
  }, [odds]);

  const Cell = (b: any) => (
    <button
      key={b.key}
      disabled={disabled}
      onClick={() => onBet({ ...b.payload, amount: chip })}
      className={`cell-btn ${winKeys.has(b.key) ? "win-flash" : ""}`}
    >
      <div className="cell-title">{b.title}</div>
      <div className="cell-odds">{`x${b.odds}`}</div>
    </button>
  );

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="glass p-3 rounded-lg grid grid-cols-2 gap-3">{bigSmall.map(Cell)}</div>
      <div className="glass p-3 rounded-lg grid grid-cols-6 gap-3">{totals.map(Cell)}</div>
      <div className="glass p-3 col-span-full flex gap-3">
        {[10, 100, 1000, 5000].map((v) => (
          <button key={v} onClick={() => setChip(v)} className={chip === v ? "bg-white/20 px-3 py-2" : "px-3 py-2"}>
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}
