// app/bank/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useBank } from "@/hooks/useBank";

export default function BankPage() {
  const {
    me,
    items,
    hasMore,
    loadMore,
    loading,
    acting,
    error,
    deposit,
    withdraw,
    transfer,
  } = useBank();

  const [depAmount, setDepAmount] = useState("");
  const [wdAmount, setWdAmount] = useState("");
  const [toUserId, setToUserId] = useState("");
  const [tfAmount, setTfAmount] = useState("");

  return (
    <main className="bank-wrap" style={{ padding: 24, maxWidth: 1000, margin: "0 auto" }}>
      <header style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0 }}>銀行帳戶</h1>
          <small style={{ opacity: 0.7 }}>
            今日銀行流出：{me?.dailyOut?.toLocaleString?.() ?? 0}
          </small>
        </div>
        <Link href="/" style={{ textDecoration: "none" }}>← 回大廳</Link>
      </header>

      {/* 餘額卡 */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div className="card">
          <div className="label">錢包</div>
          <div className="value">{me?.wallet?.toLocaleString?.() ?? 0}</div>
        </div>
        <div className="card">
          <div className="label">銀行</div>
          <div className="value">{me?.bank?.toLocaleString?.() ?? 0}</div>
        </div>
        <div className="card">
          <div className="label">今日銀行流出</div>
          <div className="value red">{me?.dailyOut?.toLocaleString?.() ?? 0}</div>
        </div>
      </section>

      {/* 操作表單 */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <form
          className="card"
          onSubmit={async (e) => {
            e.preventDefault();
            const v = parseInt(depAmount, 10);
            await deposit(v);
            setDepAmount("");
          }}
        >
          <div className="label">存款（錢包 → 銀行）</div>
          <input
            type="number"
            min={1}
            value={depAmount}
            onChange={(e) => setDepAmount(e.target.value)}
            placeholder="金額"
          />
          <button disabled={acting || !depAmount}>存入</button>
        </form>

        <form
          className="card"
          onSubmit={async (e) => {
            e.preventDefault();
            const v = parseInt(wdAmount, 10);
            await withdraw(v);
            setWdAmount("");
          }}
        >
          <div className="label">提領（銀行 → 錢包）</div>
          <input
            type="number"
            min={1}
            value={wdAmount}
            onChange={(e) => setWdAmount(e.target.value)}
            placeholder="金額"
          />
          <button disabled={acting || !wdAmount}>提領</button>
        </form>

        <form
          className="card"
          onSubmit={async (e) => {
            e.preventDefault();
            const v = parseInt(tfAmount, 10);
            await transfer(toUserId.trim(), v);
            setTfAmount("");
            setToUserId("");
          }}
        >
          <div className="label">轉帳（銀行 → 他人銀行）</div>
          <input
            type="text"
            value={toUserId}
            onChange={(e) => setToUserId(e.target.value)}
            placeholder="對方使用者 ID"
          />
          <input
            type="number"
            min={1}
            value={tfAmount}
            onChange={(e) => setTfAmount(e.target.value)}
            placeholder="金額"
          />
          <button disabled={acting || !tfAmount || !toUserId.trim()}>轉帳</button>
        </form>
      </section>

      {/* 流水紀錄 */}
      <section className="card" style={{ marginBottom: 24 }}>
        <div className="label" style={{ marginBottom: 8 }}>最近流水（BANK）</div>
        {loading && <div>載入中…</div>}
        {!loading && items.length === 0 && <div>目前沒有資料</div>}
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {items.map((it) => (
            <li
              key={it.id}
              style={{
                display: "grid",
                gridTemplateColumns: "160px 120px 1fr",
                gap: 12,
                padding: "8px 0",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <span style={{ opacity: 0.8 }}>
                {new Date(it.createdAt).toLocaleString()}
              </span>
              <b
                style={{
                  color:
                    it.type === "DEPOSIT" ? "var(--green, #48d597)" : "var(--red, #ff6b6b)",
                }}
              >
                {it.type}
              </b>
              <span>{it.amount.toLocaleString()}</span>
            </li>
          ))}
        </ul>
        {hasMore && (
          <div style={{ marginTop: 12 }}>
            <button onClick={loadMore} disabled={loading}>
              載入更多
            </button>
          </div>
        )}
      </section>

      {/* 錯誤提示 */}
      {error && (
        <div
          style={{
            padding: 12,
            background: "rgba(255,80,80,0.15)",
            border: "1px solid rgba(255,80,80,0.35)",
            borderRadius: 8,
          }}
        >
          {error}
        </div>
      )}

      <style jsx global>{`
        .card {
          background: rgba(10, 12, 20, 0.65);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          padding: 16px;
          backdrop-filter: blur(10px);
        }
        .label {
          font-size: 12px;
          letter-spacing: 0.08em;
          opacity: 0.8;
          margin-bottom: 8px;
        }
        .value {
          font-size: 28px;
          font-weight: 700;
        }
        .value.red {
          color: #ff6b6b;
        }
        input {
          width: 100%;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 10px;
          color: #fff;
          padding: 10px 12px;
          margin: 6px 0 10px;
          outline: none;
        }
        button {
          background: linear-gradient(90deg, #00d1ff 0%, #7a5cff 100%);
          color: #0c0f17;
          border: none;
          padding: 10px 14px;
          border-radius: 10px;
          cursor: pointer;
          font-weight: 700;
        }
        button[disabled] {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </main>
  );
}
