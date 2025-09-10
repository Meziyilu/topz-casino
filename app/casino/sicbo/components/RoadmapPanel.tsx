"use client";

export default function RoadmapPanel({ history }: { history: any[] }) {
  return (
    <div className="glass p-3 rounded-lg">
      <div className="text-sm opacity-80 mb-2">珠盤路</div>
      <div className="grid grid-cols-20 gap-1">
        {history.slice(0, 40).map((h, i) => {
          const color = h.isTriple ? "bg-yellow-400" : h.sum >= 11 ? "bg-green-500" : "bg-red-500";
          return <div key={i} className={`w-4 h-4 rounded ${color}`} title={`${h.sum}`}></div>;
        })}
      </div>
    </div>
  );
}
