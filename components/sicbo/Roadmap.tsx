"use client";

type HistoryItem = { id: string; dice: number[]; endedAt: string };

function sum(d: number[]) {
  return (d?.[0] || 0) + (d?.[1] || 0) + (d?.[2] || 0);
}
function isTriple(d: number[]) {
  return d?.[0] === d?.[1] && d?.[1] === d?.[2];
}

export default function Roadmap({ history }: { history: HistoryItem[] }) {
  if (!history?.length) return <div className="roadmap-empty">暫無歷史</div>;

  return (
    <div className="roadmap glass">
      {history.map((h) => {
        const s = sum(h.dice);
        const triple = isTriple(h.dice);
        const tag = triple ? "豹子" : s >= 11 ? "大" : "小";

        return (
          <div key={h.id} className="roadmap-cell">
            <div className="dice-mini">
              {h.dice.map((d, i) => (
                <span key={i} className={`pip face-${d}`} />
              ))}
            </div>
            <div className="meta">
              <span className="sum">{s}</span>
              <span className="tag">{tag}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
