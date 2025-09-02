"use client";
import BetChip from "./BetChip";
import { useMemo, useState } from "react";

export type BetItem =
  | { kind: "PICKS"; picks: number[]; amount: number }
  | { kind: "SPECIAL_ODD" | "SPECIAL_EVEN" | "SPECIAL_BIG" | "SPECIAL_SMALL"; amount: number }
  | { kind: "BALL_ATTR"; ballIndex: number; attr: "BIG" | "SMALL" | "ODD" | "EVEN"; amount: number };

type Props = {
  picksCount: number; pickMax: number; betTiers: number[]; bigThreshold: number;
  locked: boolean; onPlace: (items: BetItem[], total: number) => Promise<void>;
};

export default function LottoBetPanel({ picksCount, pickMax, betTiers, bigThreshold, locked, onPlace }: Props) {
  const [picked, setPicked] = useState<number[]>([]);
  const [amount, setAmount] = useState<number>(betTiers[0] ?? 10);
  const [placing, setPlacing] = useState<boolean>(false);

  const canPick = picked.length < picksCount;
  function togglePick(n: number): void {
    if (locked) return;
    if (picked.includes(n)) { setPicked((xs) => xs.filter((x) => x !== n)); }
    else if (canPick) { setPicked((xs) => [...xs, n].sort((a, b) => a - b)); }
  }

  const grid = useMemo(() => [...Array.from({ length: pickMax }, (_, i) => i + 1)], [pickMax]);

  async function submit(items: BetItem[]): Promise<void> {
    if (items.length === 0) return;
    const total = items.reduce((acc, it) => acc + ("amount" in it ? it.amount : 0), 0);
    setPlacing(true);
    try { await onPlace(items, total); } finally { setPlacing(false); }
  }

  return (
    <div className="glass p-4 md:p-6">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="font-semibold">下注金額</div>
        <div className="flex gap-2">
          {betTiers.map((v) => (
            <BetChip key={v} value={v} active={amount === v} onClick={() => setAmount(v)} disabled={locked || placing} />
          ))}
        </div>
      </div>

      <div className="mb-2 flex items-center justify-between">
        <div className="font-semibold">6/49 選號</div>
        <div className="text-sm text-white/60">{picked.length}/{picksCount}</div>
      </div>
      <div className="grid grid-cols-7 sm:grid-cols-9 md:grid-cols-12 gap-2 mb-3">
        {grid.map((n) => {
          const chosen = picked.includes(n);
          const big = n >= bigThreshold;
          const even = n % 2 === 0;
          return (
            <button
              key={n}
              onClick={() => togglePick(n)}
              disabled={locked}
              className={[
                "h-9 rounded-md border text-sm font-semibold transition-all hover:scale-[1.03] focus:outline-none",
                chosen ? "bg-primary/90 border-white/30 text-white" : "bg-white/5 border-white/10 text-white/90",
                big ? "ring-1 ring-primary/40" : "",
              ].join(" ")}
              title={`${n}（${big ? "大" : "小"}/${even ? "雙" : "單"}）`}
            >
              {n}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2 mb-6">
        <button className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10"
                onClick={() => setPicked([])} disabled={locked || placing || picked.length === 0}>清除選號</button>
        <button className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow"
                onClick={() => submit(picked.length === picksCount ? [{ kind: "PICKS", picks: picked, amount }] : [])}
                disabled={locked || placing || picked.length !== picksCount}>下「選號」{amount} 元</button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="glass p-4">
          <div className="font-semibold mb-2">特別號</div>
          <div className="flex flex-wrap gap-2">
            {[
              { k: "SPECIAL_ODD", text: "單" },
              { k: "SPECIAL_EVEN", text: "雙" },
              { k: "SPECIAL_BIG", text: "大" },
              { k: "SPECIAL_SMALL", text: "小" },
            ].map((x) => (
              <button key={x.k} onClick={() => submit([{ kind: x.k as BetItem["kind"], amount }])}
                      disabled={locked || placing}
                      className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 font-semibold">
                {x.text}（{amount}）
              </button>
            ))}
          </div>
        </div>

        <div className="glass p-4">
          <div className="font-semibold mb-2">各球屬性（第 1~6 顆）</div>
          <div className="grid grid-cols-6 gap-2">
            {[1,2,3,4,5,6].map((idx) => (
              <div key={idx} className="space-y-2">
                <div className="text-xs text-white/60 text-center">第 {idx} 顆</div>
                {(["BIG","SMALL","ODD","EVEN"] as const).map((attr) => (
                  <button key={attr}
                          onClick={() => submit([{ kind: "BALL_ATTR", ballIndex: idx, attr, amount }])}
                          disabled={locked || placing}
                          className="w-full px-2 py-1.5 rounded-md bg-white/10 hover:bg-white/15 border border-white/10 text-xs">
                    {attr === "BIG" ? "大" : attr === "SMALL" ? "小" : attr === "ODD" ? "單" : "雙"}（{amount}）
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 text-xs text-white/60">小提醒：相同選項重複下注會自動累加金額（去重 Upsert）。</div>
    </div>
  );
}
