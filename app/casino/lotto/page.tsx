// app/casino/lotto/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import "@/public/styles/lotto.css";

type StateResp = {
  current: { id:string; code:number; drawAt:string; status:"OPEN"|"LOCKED"; numbers:number[]; special:number|null; pool:number; jackpot:number } | null;
  last: { id:string; code:number; numbers:number[]; special:number|null } | null;
  config: { drawIntervalSec:number; lockBeforeDrawSec:number; picksCount:number; pickMax:number; betTiers:number[] };
  serverTime: string;
  locked: boolean;
};

function secsLeft(drawAt: string) {
  const t = new Date(drawAt).getTime();
  const now = Date.now();
  return Math.max(0, Math.floor((t - now) / 1000));
}

export default function LottoLobby() {
  const [s, setS] = useState<StateResp|null>(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const pull = async () => {
      const r = await fetch("/api/casino/lotto/state", { cache: "no-store" });
      const j = await r.json();
      setS(j);
    };
    pull();
    const t = setInterval(() => {
      setCount(c => c + 1);
      pull();
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const left = s?.current ? secsLeft(s.current.drawAt) : 0;

  return (
    <main className="lotto-lobby glass">
      <header className="lotto-head">
        <h1>樂透大廳</h1>
        <p className="sub">每 {s?.config.drawIntervalSec ?? 30}s 開獎 · 開獎前 {s?.config.lockBeforeDrawSec ?? 5}s 封盤</p>
      </header>

      <section className="lotto-panels">
        <div className="panel">
          <h3>本期（#{s?.current?.code ?? "-"})</h3>
          <div className="countdown">{left}s</div>
          <div className="status">{s?.current?.status ?? "-"}</div>
          <div className="pools">
            <div>Pool：<strong>{s?.current?.pool ?? 0}</strong></div>
            <div>Jackpot：<strong>{s?.current?.jackpot ?? 0}</strong></div>
          </div>
          <div className="balls-roller">
            <div className="roller-track">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="ball rolling">{((i*7)%49)+1}</div>
              ))}
            </div>
          </div>
          <Link href="/casino/lotto/play" className="btn-primary">前往投注</Link>
        </div>

        <div className="panel">
          <h3>上期結果（#{s?.last?.code ?? "-"})</h3>
          {s?.last ? (
            <div className="balls">
              {s.last.numbers.map(n => <div key={n} className="ball">{n}</div>)}
              {s.last.special != null && <div className="ball special">{s.last.special}</div>}
            </div>
          ) : <div className="muted">尚無</div>}
        </div>
      </section>
    </main>
  );
}
