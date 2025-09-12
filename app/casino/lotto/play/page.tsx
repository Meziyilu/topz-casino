// app/casino/lotto/play/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import "@/public/styles/lotto.css";

type StateResp = {
  current: { id:string; code:number; drawAt:string; status:"OPEN"|"LOCKED"; numbers:number[]; special:number|null; pool:number; jackpot:number } | null;
  config: { drawIntervalSec:number; lockBeforeDrawSec:number; picksCount:number; pickMax:number; betTiers:number[] };
};

function secsLeft(drawAt: string) {
  const t = new Date(drawAt).getTime();
  return Math.max(0, Math.floor((t - Date.now())/1000));
}

export default function LottoPlay() {
  const [s, setS] = useState<StateResp|null>(null);
  const [userId, setUserId] = useState("");
  const [amount, setAmount] = useState<number>(100);
  const [picked, setPicked] = useState<number[]>([]);
  const [placing, setPlacing] = useState(false);
  const [toast, setToast] = useState<string>("");

  const pickMax = s?.config.pickMax ?? 49;
  const picksCount = s?.config.picksCount ?? 6;

  const options = useMemo(() => Array.from({ length: pickMax }, (_, i) => i+1), [pickMax]);

  useEffect(() => {
    const pull = async () => {
      const r = await fetch("/api/casino/lotto/state", { cache: "no-store" });
      const j = await r.json();
      setS({ current: j.current, config: j.config });
    };
    pull();
    const t = setInterval(pull, 1000);
    return () => clearInterval(t);
  }, []);

  function toggle(n: number) {
    if (picked.includes(n)) setPicked(picked.filter(x => x !== n));
    else if (picked.length < picksCount) setPicked([...picked, n].sort((a, b) => a - b));
  }

  function quick(n: number) {
    const nums: number[] = [];
    const pool = [...options];
    for (let i = 0; i < picksCount; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      nums.push(pool[idx]);
      pool.splice(idx, 1);
    }
    nums.sort((a,b)=>a-b);
    setPicked(nums);
    setAmount(n);
  }

  async function place() {
    if (!userId) { setToast("請輸入 User ID"); return; }
    if (!s?.current) { setToast("目前無可下注場次"); return; }
    if (s.current.status !== "OPEN") { setToast("已鎖盤"); return; }
    if (picked.length !== picksCount) { setToast(`需選 ${picksCount} 顆`); return; }
    setPlacing(true);
    try {
      const r = await fetch("/api/casino/lotto/bet", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, picks: picked, amount }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "下注失敗");
      setToast("下注成功！");
    } catch (e: any) {
      setToast(e.message);
    } finally {
      setPlacing(false);
    }
  }

  const left = s?.current ? secsLeft(s.current.drawAt) : 0;

  return (
    <main className="lotto-play glass">
      <header className="lotto-head">
        <h1>樂透投注</h1>
        <div className="hint">本期 #{s?.current?.code ?? "-"} · 倒數 <strong>{left}</strong>s · 狀態 {s?.current?.status ?? "-"}</div>
      </header>

      <section className="panel">
        <div className="form-row">
          <label>User ID</label>
          <input value={userId} onChange={e=>setUserId(e.target.value)} placeholder="輸入你的 User.id" />
        </div>
        <div className="form-row">
          <label>注金</label>
          <input type="number" value={amount} onChange={e=>setAmount(parseInt(e.target.value||"0"))} />
          <div className="chips">
            {(s?.config.betTiers ?? [10,50,100,200]).map(n => (
              <button key={n} className="chip" onClick={()=>setAmount(n)}>{n}</button>
            ))}
            <button className="chip" onClick={()=>quick(100)}>隨機選號100</button>
          </div>
        </div>

        <div className="pick-grid">
          {options.map(n => (
            <button key={n} className={`num ${picked.includes(n) ? "picked":""}`} onClick={()=>toggle(n)}>{n}</button>
          ))}
        </div>

        <div className="picked-bar">
          已選：{picked.length ? picked.join(", ") : "（尚未選號）"}
        </div>

        <div className="actions">
          <button className="btn-primary" disabled={placing || !s?.current || s.current.status!=="OPEN"} onClick={place}>
            {placing ? "下注中..." : "下注"}
          </button>
          <button className="btn-ghost" onClick={()=>setPicked([])}>清除</button>
        </div>

        {toast && <div className="toast">{toast}</div>}
      </section>

      <section className="panel">
        <h3>滾珠動畫</h3>
        <div className="balls-roller">
          <div className="roller-track">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="ball rolling">{((i*13)%pickMax)+1}</div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
