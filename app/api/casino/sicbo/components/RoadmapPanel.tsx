"use client";

type HistoryItem = {
  daySeq: number;
  die1: number;
  die2: number;
  die3: number;
  sum: number;
  isTriple: boolean;
};

export default function RoadmapPanel({ history }: { history: HistoryItem[] }) {
  const beads = history.slice(0, 60).reverse();

  return (
    <div className="glass p-3 rounded-lg">
      <div className="text-sm opacity-80 mb-2">Bead Road (yellow = triple)</div>

      <div className="grid grid-cols-20 gap-1">
        {beads.map((h, i) => {
          const color = h.isTriple ? "bg-yellow-400" : h.sum >= 11 ? "bg-green-500" : "bg-red-500";
          return <div key={i} className={`w-4 h-4 rounded ${color}`} title={`${h.sum}`}></div>;
        })}
      </div>

      <div className="text-sm opacity-80 mt-3">Summary (last {history.length} rounds)</div>
      <div className="flex gap-3 mt-1 text-xs opacity-80">
        <div>Big: {history.filter(h => !h.isTriple && h.sum >= 11).length}</div>
        <div>Small: {history.filter(h => !h.isTriple && h.sum <= 10).length}</div>
        <div>Triples: {history.filter(h => h.isTriple).length}</div>
      </div>
    </div>
  );
}
