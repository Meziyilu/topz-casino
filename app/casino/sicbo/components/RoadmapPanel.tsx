"use client";

import { useMemo } from "react";

type H = {
  daySeq: number;
  die1: number;
  die2: number;
  die3: number;
  sum: number;
  isTriple: boolean;
};

export default function RoadmapPanel({ history }: { history: H[] }) {
  // 珠盤路（近 60）
  const beads = useMemo(
    () =>
      history
        .slice(0, 60)
        .reverse()
        .map((h) => {
          const big = h.sum >= 11;
          const color = h.isTriple
            ? "bg-yellow-400"
            : big
            ? "bg-green-500"
            : "bg-red-500";
          return { color, label: h.sum };
        }),
    [history]
  );

  // 總點分布
  const sumCounts = useMemo(() => {
    const m = new Map<number, number>();
    for (let i = 4; i <= 17; i++) m.set(i, 0);
    history.forEach((h) => m.set(h.sum, (m.get(h.sum) || 0) + 1));
    return Array.from(m.entries()).sort((a, b) => a[0] - b[0]);
  }, [history]);

  // 骰面熱度
  const faceCounts = useMemo(() => {
    const c: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    history.forEach((h) => [h.die1, h.die2, h.die3].forEach((v) => (c[v]++)));
    return c;
  }, [history]);

  return (
    <div className="glass p-3 space-y-3 rounded-lg">
      {/* 珠盤路 */}
      <div className="text-sm opacity-80">珠盤路（大/小，圍骰以黃標）</div>
      <div className="grid grid-cols-20 gap-1">
        {beads.map((b, i) => (
          <div key={i} className={`w-4 h-4 rounded ${b.color}`} title={`${b.label}`}></div>
        ))}
      </div>

      {/* 總點分布 */}
      <div className="text-sm opacity-80 mt-2">
        總點分布（近 {history.length} 局）
      </div>
      <div className="flex gap-2 items-end">
        {sumCounts.map(([sum, cnt]) => (
          <div key={sum} className="text-center">
            <div className="bg-white/20 w-4" style={{ height: `${cnt * 8 + 4}px` }}></div>
            <div className="text-xs opacity-80 mt-1">{sum}</div>
          </div>
        ))}
      </div>

      {/* 骰面熱度 */}
      <div className="text-sm opacity-80 mt-2">骰面熱度</div>
      <div className="grid grid-cols-6 gap-2">
        {[1, 2, 3, 4, 5, 6].map((f) => (
          <div key={f} className="glass p-2 text-center rounded">
            <div className="text-xs opacity-80 mb-1">{f}</div>
            <div
              className="bg-white/30 h-2 rounded"
              style={{ width: `${Math.min(100, (faceCounts[f] || 0) * 4)}%` }}
            ></div>
          </div>
        ))}
      </div>
    </div>
  );
}
