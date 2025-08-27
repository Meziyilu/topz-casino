'use client';

import { useEffect, useState } from "react";

type Ledger = { id:string; type:string; target:string; delta:number; memo?:string; createdAt:string };
type UserRow = {
  id:string; email:string; name?:string|null; balance:number; bankBalance:number; createdAt:string;
  ledgers: Ledger[];
};

export default function AdminPage() {
  const [q, setQ] = useState("");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const load = async () => {
    setLoading(true); setMsg("");
    try {
      const r = await fetch(`/api/admin/users?q=${encodeURIComponent(q)}`, { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) setMsg(d?.error || "讀取失敗");
      else setUsers(d.users || []);
    } catch { setMsg("連線失敗"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const adjust = async (userId: string, target: "WALLET"|"BANK", amount: number, memo?: string) => {
    setMsg("");
    try {
      const r = await fetch("/api/admin/wallet/adjust", {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({ userId, target, amount, memo })
      });
      const d = await r.json();
      if (!r.ok) { setMsg(d?.error || "調整失敗"); return; }
      await load();
    } catch { setMsg("連線失敗"); }
  };

  return (
    <div className="glass neon">
      <div className="content">
        <div className="row space-between">
          <h1 className="h1">管理員面板</h1>
          <div className="row">
            <input className="input" placeholder="搜尋 email / 暱稱" value={q} onChange={e=>setQ(e.target.value)} />
            <button className="btn shimmer" onClick={load} disabled={loading}>搜尋</button>
          </div>
        </div>

        {msg && <div className="note mt16" style={{color:'#f87171'}}>{msg}</div>}

        <div className="grid">
          {users.map(u=>(
            <div key={u.id} className="card col-6">
              <h3>{u.name || u.email}</h3>
              <div className="row" style={{justifyContent:'space-between', flexWrap:'wrap', gap:8}}>
                <div>錢包：<b>{u.balance.toLocaleString()}</b></div>
                <div>銀行：<b>{u.bankBalance.toLocaleString()}</b></div>
                <div className="subtle">建立：{new Date(u.createdAt).toLocaleString()}</div>
              </div>

              {/* 快捷調整 */}
              <div className="mt16">
                <div className="subtle">快捷調整（錢包）：</div>
                <div className="row" style={{gap:8}}>
                  <button className="btn" onClick={()=>adjust(u.id, "WALLET",  1000, "admin quick +1000")}>+1000</button>
                  <button className="btn-secondary btn" onClick={()=>adjust(u.id, "WALLET", -1000, "admin quick -1000")}>-1000</button>
                </div>
              </div>

              <div className="mt8">
                <div className="subtle">快捷調整（銀行）：</div>
                <div className="row" style={{gap:8}}>
                  <button className="btn" onClick={()=>adjust(u.id, "BANK",  1000, "admin quick +1000")}>+1000</button>
                  <button className="btn-secondary btn" onClick={()=>adjust(u.id, "BANK", -1000, "admin quick -1000")}>-1000</button>
                </div>
              </div>

              {/* 自訂調整 */}
              <CustomAdjust onSubmit={(target, amount, memo)=>adjust(u.id, target, amount, memo)} />
              
              {/* 最近 5 筆 */}
              <div className="mt16">
                <div className="subtle">最近 5 筆交易</div>
                {u.ledgers.length===0 ? <div className="note">（無資料）</div> : (
                  <ul>
                    {u.ledgers.map(g=>(
                      <li key={g.id} className="note">
                        [{g.type}/{g.target}] {g.delta>0?'+':''}{g.delta} ← {g.memo || '—'} · {new Date(g.createdAt).toLocaleString()}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

function CustomAdjust({ onSubmit }: { onSubmit: (t:"WALLET"|"BANK", a:number, m?:string)=>void }) {
  const [target, setTarget] = useState<"WALLET"|"BANK">("WALLET");
  const [amount, setAmount] = useState<number>(5000);
  const [memo, setMemo] = useState<string>("");

  return (
    <div className="card mt16">
      <h4>自訂調整</h4>
      <div className="row" style={{gap:8, flexWrap:'wrap'}}>
        <select className="input" value={target} onChange={e=>setTarget(e.target.value as any)}>
          <option value="WALLET">錢包</option>
          <option value="BANK">銀行</option>
        </select>
        <input className="input" type="number" value={amount} onChange={e=>setAmount(parseInt(e.target.value||"0",10))} />
        <input className="input" placeholder="備註（可留空）" value={memo} onChange={e=>setMemo(e.target.value)} />
        <button className="btn shimmer" onClick={()=>onSubmit(target, amount, memo || undefined)}>送出</button>
      </div>
    </div>
  );
}
