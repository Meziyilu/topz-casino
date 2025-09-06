// app/bank/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Balances = {
  wallet: number;
  bank: number;
  dailyOut: number;
};

type Item = {
  id: string;
  createdAt: string;
  kind: "DEPOSIT" | "WITHDRAW" | "TRANSFER" | string;
  amount: number;
  memo?: string | null;
  refUserId?: string | null;
  bankAfter: number;
  walletAfter: number;
};

export default function BankPage() {
  const [b, setB] = useState<Balances | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [toUserId, setToUserId] = useState("");
  const [memo, setMemo] = useState("");
  const [hist, setHist] = useState<Item[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  async function refresh() {
    const r = await fetch("/api/bank/me", { credentials: "include" });
    const d = await r.json();
    if (r.ok && d.ok) setB({ wallet: d.wallet, bank: d.bank, dailyOut: d.dailyOut });
  }
  async function loadHistory(cursor?: string | null) {
    const url = new URL("/api/bank/history", location.origin);
    if (cursor) url.searchParams.set("cursor", cursor);
    url.searchParams.set("limit", "20");
    const r = await fetch(url, { credentials: "include" });
    const d = await r.json();
    if (r.ok && d.ok) {
      setHist((s) => (cursor ? [...s, ...d.items] : d.items));
      setNextCursor(d.nextCursor ?? null);
    }
  }

  useEffect(() => {
    refresh();
    loadHistory();
  }, []);

  const onDo = async (path: "/api/bank/deposit" | "/api/bank/withdraw" | "/api/bank/transfer") => {
    if (busy) return;
    setBusy(true);
    try {
      let payload: any = { amount: Number(amount) || 0, memo: memo || undefined };
      if (path === "/api/bank/transfer") payload.toUserId = toUserId.trim();
      const r = await fetch(path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.ok) throw new Error(d?.error || "操作失敗");
      setToast("操作成功 ✅");
      setAmount(0);
      setMemo("");
      await refresh();
      await loadHistory(); // 重新抓歷史（簡單起見）
    } catch (e: any) {
      setToast(e?.message || "發生錯誤");
    } finally {
      setBusy(false);
      setTimeout(() => setToast(null), 1800);
    }
  };

  return (
    <main className="lb-wrap">
      <div className="lb-bg" />
      <div className="lb-particles" aria-hidden />

      <header className="lb-header">
        <div className="left">
          <Link className="lb-logo" href="/">TOPZCASINO</Link>
          <span className="lb-beta">BANK</span>
        </div>
        <div className="right">
          <Link className="lb-btn" href="/">回大廳</Link>
        </div>
      </header>

      <div className="lb-grid">
        <aside className="lb-col">
          <div className="lb-card">
            <div className="lb-card-title">餘額</div>
            <div className="lb-list soft">
              <div>錢包：<b>{(b?.wallet ?? 0).toLocaleString()}</b></div>
              <div>銀行：<b>{(b?.bank ?? 0).toLocaleString()}</b></div>
              <div>今日銀行流出：<b>{(b?.dailyOut ?? 0).toLocaleString()}</b></div>
            </div>
          </div>

          <div className="lb-card">
            <div className="lb-card-title">操作</div>
            <div style={{ display: "grid", gap: 10 }}>
              <div className="pf-field">
                <input
                  placeholder=" "
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(parseInt(e.target.value || "0", 10))}
                  min={0}
                />
                <label>金額（整數）</label>
              </div>
              <div className="pf-field">
                <input placeholder=" " value={memo} onChange={(e) => setMemo(e.target.value)} />
                <label>備註（可選）</label>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="lb-btn" disabled={busy} onClick={() => onDo("/api/bank/deposit")}>存款 → 銀行</button>
                <button className="lb-btn" disabled={busy} onClick={() => onDo("/api/bank/withdraw")}>提領 → 錢包</button>
              </div>
            </div>
          </div>

          <div className="lb-card">
            <div className="lb-card-title">轉帳（銀行→他人銀行）</div>
            <div className="pf-field">
              <input placeholder=" " value={toUserId} onChange={(e) => setToUserId(e.target.value)} />
              <label>對方 UserId</label>
            </div>
            <button className="lb-btn" disabled={busy} onClick={() => onDo("/api/bank/transfer")}>轉帳</button>
          </div>
        </aside>

        <section className="lb-col">
          <div className="lb-card">
            <div className="lb-card-title">最近流水（BANK）</div>
            <div className="lb-list soft" style={{ maxHeight: 460, overflow: "auto" }}>
              {hist.map((x) => (
                <div key={x.id} style={{ display: "grid", gridTemplateColumns: "110px 1fr auto", gap: 8, padding: "6px 0", borderBottom: "1px dashed var(--border)" }}>
                  <div>{new Date(x.createdAt).toLocaleString()}</div>
                  <div>
                    <b>{x.kind}</b>：{x.amount.toLocaleString()}
                    {x.refUserId ? <span style={{ opacity: .7 }}>（對象：{x.refUserId}）</span> : null}
                    {x.memo ? <div style={{ opacity: .75, fontSize: 13 }}>備註：{x.memo}</div> : null}
                  </div>
                  <div style={{ textAlign: "right", opacity: .8 }}>
                    <div>銀行餘額：{x.bankAfter.toLocaleString()}</div>
                  </div>
                </div>
              ))}
              {nextCursor ? (
                <button className="lb-btn" style={{ marginTop: 10 }} onClick={() => loadHistory(nextCursor)}>
                  載入更多
                </button>
              ) : null}
            </div>
          </div>
        </section>
      </div>

      {toast && (
        <div className="pf-toast ok" style={{ position: "fixed", left: "50%", bottom: 20, transform: "translateX(-50%)" }}>
          {toast}
        </div>
      )}
    </main>
  );
}
