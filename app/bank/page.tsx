"use client";

import { useEffect, useState } from "react";

type Wallet = { balance: number; bankBalance: number };

export default function BankPage() {
  const [wallet, setWallet] = useState<Wallet>({ balance: 0, bankBalance: 0 });
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState<"BANK" | "WALLET">("BANK");
  const [amount, setAmount] = useState<number>(100);
  const [msg, setMsg] = useState<string | null>(null);

  async function fetchWallet() {
    try {
      const res = await fetch("/api/wallet", { cache: "no-store" });
      const data = await res.json();
      if (res.ok) setWallet({ balance: data.balance ?? 0, bankBalance: data.bankBalance ?? 0 });
      else setMsg(data?.error || "讀取餘額失敗");
    } catch (e:any) {
      setMsg(e?.message || "讀取餘額失敗");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchWallet(); }, []);

  async function transfer() {
    setMsg(null);
    try {
      const res = await fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ from, amount }),
      });
      const data = await res.json().catch(()=> ({}));
      if (!res.ok) throw new Error(data?.error || "轉帳失敗");
      setMsg("轉帳成功");
      await fetchWallet();
    } catch (e:any) {
      setMsg(e?.message || "轉帳失敗");
    }
  }

  return (
    <div className="min-h-screen p-6 space-y-6">
      <header className="max-w-4xl mx-auto flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-[.2em]">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-400 via-brand-200 to-brand-500">
            TOPZCASINO
          </span>
        </h1>
        <a href="/casino" className="badge hover:brightness-110">返回大廳</a>
      </header>

      <section className="max-w-4xl mx-auto grid gap-6 md:grid-cols-3">
        <div className="glass rounded-xl p-5">
          <div className="text-sm opacity-70">錢包</div>
          <div className="text-3xl font-extrabold">{loading ? "—" : wallet.balance.toLocaleString()}</div>
        </div>
        <div className="glass rounded-xl p-5">
          <div className="text-sm opacity-70">銀行</div>
          <div className="text-3xl font-extrabold">{loading ? "—" : wallet.bankBalance.toLocaleString()}</div>
        </div>
        <div className="glass rounded-xl p-5 grid place-items-center">
          <div className="text-sm opacity-70">快速刷新</div>
          <button onClick={fetchWallet} className="btn rounded-lg mt-2">更新餘額</button>
        </div>
      </section>

      <section className="max-w-4xl mx-auto glass rounded-2xl p-6">
        <h2 className="text-lg font-semibold mb-4">銀行 ⇄ 錢包 轉帳</h2>
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="flex items-center gap-3">
            <label className="text-sm opacity-80">來源</label>
            <select
              value={from}
              onChange={e => setFrom(e.target.value as any)}
              className="px-3 py-2 rounded-md bg-black/20 border border-white/15 focus:outline-none"
            >
              <option value="BANK">銀行 → 錢包</option>
              <option value="WALLET">錢包 → 銀行</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm opacity-80">金額</label>
            <input
              type="number"
              min={1}
              value={amount}
              onChange={e => setAmount(Math.max(1, Number(e.target.value || 1)))}
              className="w-40 px-3 py-2 rounded-md bg-black/20 border border-white/15 focus:outline-none"
            />
            <div className="flex gap-2">
              {[100,500,1000,5000].map(v=>(
                <button key={v} onClick={()=>setAmount(v)} className="bet-btn">{v}</button>
              ))}
            </div>
          </div>

          <button onClick={transfer} className="btn rounded-lg">確認轉帳</button>
        </div>

        {msg && <div className="mt-3 text-sm opacity-90">{msg}</div>}
      </section>
    </div>
  );
}
