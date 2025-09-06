// components/lobby/Leaderboard.tsx
"use client";

type Item = {
  rank: number;
  displayName: string;
  avatarUrl?: string | null;
  vipTier: number;
  netProfit: number;
  headframe?: string | null;
  panelTint?: string | null;
};

export default function Leaderboard({
  title,
  items,
}: {
  title: string;
  items: Item[];
}) {
  return (
    <div className="lb-card">
      <div className="lb-card-title">{title}</div>
      <ol className="lb-list lb-leaderboard">
        {items.map((it) => (
          <li key={it.rank} className={`lb-leaderboard-item`}>
            <span className="rank">#{it.rank}</span>
            <span className="avatar-wrap">
              <span
                className={`ava-frame ${it.headframe ? `hf-${String(it.headframe).toLowerCase()}` : "hf-none"}`}
                style={it.panelTint ? ({ ["--pf-tint" as any]: it.panelTint } as any) : undefined}
              >
                <img className="avatar" src={it.avatarUrl || "/avatar-default.png"} alt="" />
                <span className="ava-border" />
              </span>
            </span>
            <span className="name">{it.displayName}</span>
            <span className="vip">VIP {it.vipTier}</span>
            <span className={`profit ${it.netProfit >= 0 ? "up" : "down"}`}>
              {it.netProfit >= 0 ? "+" : "-"}
              {Math.abs(it.netProfit).toLocaleString()}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
