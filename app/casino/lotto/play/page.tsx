// app/casino/lotto/play/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useMe } from "@/components/useMe";
import "/public/styles/lotto.css";

type DrawLite = {
  id:string; code:number; drawAt:string; status:"OPEN"|"LOCKED"|"DRAWN"|"SETTLED";
  numbers:number[]; special:number|null; pool:number; jackpot:number;
};
type StateResp = {
  current: DrawLite | null;
  last: { id:string; code:number; numbers:number[]; special:number|null } | null;
  config: { drawIntervalSec:number; lockBeforeDrawSec:number; picksCount:number; pickMax:number; betTiers:number[] };
};

function secsLeft(drawAt: string) {
  const t = new Date(drawAt).getTime();
  return Math.max(0, Math.floor((t - Date.now())/1000));
}

export default function LottoPlay() {
  const { me, loading: meLoading, reload: reloadMe } = useMe(0);
  const [s, setS] = useState<StateResp|null>(null);
  const [amount, setAmount] = useState<number>(100);
  const [picked, setPicked] = useState<number[]>([]);
  const [placing, setPlacing] = useState(false);
  const [toast, setToast] = useState<string>("");

  const pickMax = s?.config.pickMax ?? 49;
  const picksCount = s?.config.picksCount ?? 6;

  const options = useMemo(() => Array.from({ length: pickMax }, (_, i) => i+1), [pickMax]);

  async function pullState() {
    const r = await fetch("/api/casino/lotto/state", { cache: "no-store" });
    setS(await r.json());
  }

  useEffect(() => {
    pullState();
    const t = setInterval(pullState, 1000);
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
      nums.push(pool[idx]); pool.splice(idx, 1);
    }
    nums.sort((a,b)=>a-b);
    setPicked(nums);
    setAmount(n);
  }

  async function place() {
    if (!me?.id) { setToast("尚未登入，請先登入帳號"); return; }
    if (!s?.current) { setToast("目前無可下注場次"); return; }
    if (s.current.status !== "OPEN") { setToast("已鎖盤"); return; }
    if (picked.length !== picksCount) { setToast(`需選 ${picksCount} 顆`); return; }
    setPlacing(true);
    try {
      const r = await fetch("/api/casino/lotto/bet", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: me.id, picks: picked, amount }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "下注失敗");
      setToast("下注成功！");
      setPicked([]);
      await reloadMe();
      await pullState();
    } catch (e: any) {
      setToast(e.message);
    } finally {
      setPlacing(false);
    }
  }

  const left = s?.current ? secsLeft(String(s.current.drawAt)) : 0;

  // 顯示最近的已開結果
  const showDraw = s?.current?.status === "DRAWN"
    ? { code: s.current.code, nums: s.current.numbers ?? [], special: s.current.special ?? null }
    : (s?.last ? { code: s.last.code, nums: s.last.numbers ?? [], special: s.last.special ?? null } : null);

  return (
    <main className="lotto-play glass glow">
      <header className="lotto-head">
        <h1>樂透投注</h1>
        <div className="hint">本期 #{s?.current?.code ?? "-"} · 倒數 <strong>{left}</strong>s · 狀態 {s?.current?.status ?? "-"}</div>
      </header>

      <section className="panel">
        <div className="form-row">
          <label>會員</label>
          <div style={{display:"flex", gap:8, alignItems:"center"}}>
            {meLoading ? <span className="muted">載入中…</span> :
             me ? (<>
                <span><strong>{me.displayName || me.name || me.id}</strong></span>
                <span className="muted">餘額</span><span><strong>{me.balance ?? 0}</strong></span>
              </>) : <span className="muted">未登入</span>}
          </div>
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
          <button className="btn-primary" disabled={placing || !s?.current || s.current.status!=="OPEN" || !me?.id} onClick={place}>
            {placing ? "下注中..." : "下注"}
          </button>
          <button className="btn-ghost" onClick={()=>setPicked([])}>清除</button>
        </div>

        {toast && <div className="toast">{toast}</div>}
      </section>

      {/* 只顯示已開出的號碼（帶 reveal 動畫） */}
      <section className="panel">
        <h3>最近開獎（#{showDraw?.code ?? "-"})</h3>
        <div className="balls balls-reveal">
          {showDraw?.nums.map(n => <div key={`p-${n}`} className="ball reveal">{n}</div>)}
          {showDraw && showDraw.special != null && <div className="ball special reveal">{showDraw.special}</div>}
        </div>
      </section>
    </main>
  );
}
