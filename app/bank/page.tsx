'use client';

import { useEffect, useState } from "react";
import Link from "next/link";

export default function BankPage() {
  const [wallet, setWallet] = useState(0);
  const [bank, setBank] = useState(0);
  const [amt, setAmt] = useState(100);
  const [msg, setMsg] = useState("");

  const load = async () => {
    const r = await fetch("/api/wallet", { cache: "no-store" });
    if (r.ok) {
      const d = await r.json();
      setWallet(d.wallet); setBank(d.bank);
    }
  };
  useEffect(()=>{ load(); },[]);

  const act = async (action: "deposit" | "withdraw") => {
    setMsg("");
    const r = await fetch("/api/wallet", {
      method: "POST", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ action, amount: amt })
    });
    const d = await r.json();
    if (r.ok) { setWallet(d.wallet); setBank(d.bank); }
    else setMsg(d?.error || "操作失敗");
  };

  return (
    <div className="glass neon">
      <div className="content">
        <div className="row space-between">
          <h1 className="h1">銀行</h1>
          <Link href="/lobby" className="btn-secondary btn">回大廳</Link>
        </div>
        <div className="grid">
          <div className="card col-6">
            <h3>餘額</h3>
            <div className="row" style={{gap:24}}>
              <div><div className="subtle">錢包</div><div className="stat">{wallet.toLocaleString()}</div></div>
              <div><div className="subtle">銀行</div><div className="stat">{bank.toLocaleString()}</div></div>
            </div>
          </div>
          <div className="card col-6">
            <h3>存提</h3>
            <div className="row" style={{gap:8}}>
              <input className="input" type="number" value={amt} onChange={e=>setAmt(parseInt(e.target.value||"0",10))}/>
              <button className="btn shimmer" onClick={()=>act("deposit")}>銀行→錢包</button>
              <button className="btn-secondary btn" onClick={()=>act("withdraw")}>錢包→銀行</button>
            </div>
            {msg && <div className="note mt16" style={{color:'#f87171'}}>{msg}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
