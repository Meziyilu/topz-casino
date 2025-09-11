"use client";

import { useEffect, useState } from "react";

type UserRow = {
  id: string;
  email: string;
  displayName: string;
  balance: number;
  bankBalance: number;
};

type AdjustBody = {
  userId: string;
  amount: number; // 正數=加幣；負數=扣幣
  target: "WALLET" | "BANK";
  type: "ADMIN_ADJUST" | "EXTERNAL_TOPUP";
  note?: string;
};

export default function AdminCoinsPage() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [amount, setAmount] = useState(1000);
  const [target, setTarget] = useState<"WALLET" | "BANK">("WALLET");
  const [type, setType] = useState<"ADMIN_ADJUST" | "EXTERNAL_TOPUP">("ADMIN_ADJUST");
  const [note, setNote] = useState("");

  async function search() {
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/users/search?q=${encodeURIComponent(q)}`);
      const j = await r.json();
      setRows(j.items ?? []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { search(); }, []);

  async function adjust(userId: string, sign: 1 | -1) {
    const body: AdjustBody = {
      userId,
      amount: Math.abs(amount) * sign,
      target,
      type,
      note: note?.trim() || undefined,
    };
    const r = await fetch("/api/admin/users/adjust", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await r.json();
    if (!r.ok) {
      alert(j?.error || "操作失敗");
    } else {
      // 重新拉資料
      await search();
    }
  }

  return (
    <main className="coins-admin">
      <header className="coins-head glass">
        <h1>金幣管理</h1>
        <div className="filters">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜尋 email / displayName / userId"
          />
          <button onClick={search} className="btn">搜尋</button>
        </div>

        <div className="controls">
          <div className="row">
            <label>金額</label>
            <input
              type="number"
              value={amount}
              min={1}
              onChange={(e) => setAmount(Math.max(1, Number(e.target.value || 0)))}
            />
            <button className="btn ghost" onClick={() => setAmount(1000)}>+1k</button>
            <button className="btn ghost" onClick={() => setAmount(10000)}>+1w</button>
            <button className="btn ghost" onClick={() => setAmount(100000)}>+10w</button>
          </div>
          <div className="row">
            <label>目標</label>
            <select value={target} onChange={(e) => setTarget(e.target.value as any)}>
              <option value="WALLET">錢包（可下注）</option>
              <option value="BANK">銀行</option>
            </select>
            <label>Ledger 類型</label>
            <select value={type} onChange={(e) => setType(e.target.value as any)}>
              <option value="ADMIN_ADJUST">ADMIN_ADJUST</option>
              <option value="EXTERNAL_TOPUP">EXTERNAL_TOPUP</option>
            </select>
            <input
              className="note"
              placeholder="備註（可空白）"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>
      </header>

      <section className="coins-table glass">
        <div className="thead">
          <div>使用者</div>
          <div>餘額（錢包）</div>
          <div>餘額（銀行）</div>
          <div>操作</div>
        </div>

        {loading ? (
          <div className="loading">載入中...</div>
        ) : rows.length === 0 ? (
          <div className="empty">沒有資料</div>
        ) : (
          rows.map((u) => (
            <div className="row" key={u.id}>
              <div className="user">
                <div className="name">{u.displayName || u.email}</div>
                <div className="sub">{u.id}</div>
                <div className="sub">{u.email}</div>
              </div>
              <div className="bal">${u.balance.toLocaleString()}</div>
              <div className="bal">${u.bankBalance.toLocaleString()}</div>
              <div className="ops">
                <button className="btn add" onClick={() => adjust(u.id, +1)}>+ 加幣</button>
                <button className="btn sub" onClick={() => adjust(u.id, -1)}>- 扣幣</button>
              </div>
            </div>
          ))
        )}
      </section>

      <link rel="stylesheet" href="/style/admin/coins.css" />
    </main>
  );
}
