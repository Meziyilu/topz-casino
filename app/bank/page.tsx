// app/bank/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type LedgerLite = { id: string; type: string; target: string; amount: number; createdAt: string };
type BankState = {
  wallet: number;
  bank: number;
  dailyOut: number;
  recentLedgers: LedgerLite[];
};

export default function BankPage() {
  const [data, setData] = useState<BankState | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [memo, setMemo] = useState<string>("");

  async function refresh() {
    try {
      const r = await fetch("/api/bank/me", { credentials: "include" });
      if (r.status === 401) return (window.location.href = "/login?next=/bank");
      const d = await r.json();
      setData(d);
    } catch {
      setToast("讀取失敗");
    } finally {
      setLoading(false);
      setTimeout(() => setToast(null), 1500);
    }
  }

  useEffect(() => { refresh(); }, []);

  async function call(
    path: "/api/bank/deposit" | "/api/bank/withdraw" | "/api/bank/transfer",
    body: any
  ) {
    try {
      const r = await fetch(path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (r.status === 401) return (window.location.href = "/login?next=/bank");
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d?.error ?? "操作失敗");
      setToast("成功 ✅");
      await refresh();
    } catch (e: any) {
      setToast(e?.message ?? "操作失敗");
    } finally {
      setTimeout(() => setToast(null), 1600);
    }
  }

  return (
    <main className="lb-wrap">
      <div className="lb-bg" />
      <div className="lb-particles" aria-hidden />

      <header className="lb-header">
        <div className="left">
          <Link href="/" className="lb-logo">TOPZCASINO</Link>
          <span className="lb-beta">BANK</span>
        </div>
        <div className="right" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link href="/" className="lb-btn">回大廳</Link>
        </div>
      </header>

      <div className="lb-grid">
        <section className="lb-main" style={{ gridColumn: "1 / -1" }}>
          <div className="lb-card bank">
            <div className="lb-card-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>銀行中心</span>
              <button className="lb-btn" onClick={refresh} disabled={loading}>重新整理</button>
            </div>

            {loading || !data ? (
              <p className="lb-muted">載入中…</p>
            ) : (
              <>
                <div className="lb-bank-rows">
                  <div className="lb-bank-kv"><span>錢包餘額</span><b>{data.wallet.toLocaleString()}</b></div>
                  <div className="lb-bank-kv"><span>銀行餘額</span><b>{data.bank.toLocaleString()}</b></div>
                  <div className="lb-bank-kv"><span>今日銀行流出</span><b>{data.dailyOut.toLocaleString()}</b></div>
                </div>

                <div className="lb-bank-forms">
                  <div className="lb-bank-row">
                    <input
                      className="lb-input"
                      type="number"
                      placeholder="金額（整數）"
                      value={amount || ""}
                      onChange={(e) => setAmount(parseInt(e.target.value || "0", 10))}
                      min={0}
                    />
                    <input
                      className="lb-input"
                      placeholder="備註（可空）"
                      value={memo}
                      onChange={(e) => setMemo(e.target.value)}
                      maxLength={120}
                    />
                  </div>
                  <div className="lb-bank-row">
                    <button className="lb-btn" onClick={() => call("/api/bank/deposit", { amount, memo })}>存款（錢包 → 銀行）</button>
                    <button className="lb-btn" onClick={() => call("/api/bank/withdraw", { amount, memo })}>提領（銀行 → 錢包）</button>
                  </div>
                </div>

                <div className="lb-card-title" style={{ marginTop: 16 }}>最近流水</div>
                <ul className="lb-list soft">
                  {data.recentLedgers?.length ? (
                    data.recentLedgers.map((x) => (
                      <li key={x.id}>
                        {new Date(x.createdAt).toLocaleString()}　[{x.type}/{x.target}]　{(x.amount >= 0 ? "+" : "") + x.amount.toLocaleString()}
                      </li>
                    ))
                  ) : (
                    <li>尚無紀錄</li>
                  )}
                </ul>

                {toast && <div className="lb-toast">{toast}</div>}
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
