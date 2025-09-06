// app/bank/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { fmtAmount, useBank } from "@/hooks/useBank";

export default function BankPage() {
  const { balances, history, hasMore, loadMore, loading, busy, err, setErr, actions } = useBank();

  // 表單狀態
  const [depAmt, setDepAmt] = useState<string>("");
  const [depMemo, setDepMemo] = useState<string>("");

  const [wdAmt, setWdAmt] = useState<string>("");
  const [wdMemo, setWdMemo] = useState<string>("");

  const [tfTo, setTfTo] = useState<string>("");
  const [tfAmt, setTfAmt] = useState<string>("");
  const [tfMemo, setTfMemo] = useState<string>("");

  // toast
  const [toast, setToast] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  useEffect(() => {
    if (err) {
      setToast({ type: "err", text: err });
      const t = setTimeout(() => setToast(null), 1800);
      return () => clearTimeout(t);
    }
  }, [err]);

  const onDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = parseInt(depAmt, 10);
    if (!Number.isFinite(n) || n <= 0) {
      setToast({ type: "err", text: "請輸入正整數金額" });
      return;
    }
    const ok = await actions.deposit(n, depMemo.trim() || undefined);
    if (ok) {
      setDepAmt("");
      setDepMemo("");
      setToast({ type: "ok", text: "存款成功 ✅" });
      setTimeout(() => setToast(null), 1500);
    }
  };

  const onWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = parseInt(wdAmt, 10);
    if (!Number.isFinite(n) || n <= 0) {
      setToast({ type: "err", text: "請輸入正整數金額" });
      return;
    }
    const ok = await actions.withdraw(n, wdMemo.trim() || undefined);
    if (ok) {
      setWdAmt("");
      setWdMemo("");
      setToast({ type: "ok", text: "提領成功 ✅" });
      setTimeout(() => setToast(null), 1500);
    }
  };

  const onTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = parseInt(tfAmt, 10);
    if (!tfTo.trim()) {
      setToast({ type: "err", text: "請輸入對方使用者 ID" });
      return;
    }
    if (!Number.isFinite(n) || n <= 0) {
      setToast({ type: "err", text: "請輸入正整數金額" });
      return;
    }
    const ok = await actions.transfer(tfTo.trim(), n, tfMemo.trim() || undefined);
    if (ok) {
      setTfTo("");
      setTfAmt("");
      setTfMemo("");
      setToast({ type: "ok", text: "轉帳成功 ✅" });
      setTimeout(() => setToast(null), 1500);
    }
  };

  const dailyLeft = useMemo(() => {
    if (!balances) return 0;
    const MAX = parseInt(process.env.NEXT_PUBLIC_BANK_DAILY_OUT_MAX || "2000000", 10);
    const used = balances.dailyOut || 0;
    return Math.max(0, MAX - used);
  }, [balances]);

  return (
    <main className="bank-wrap">
      <link rel="stylesheet" href="/styles/profile.css" />
      {/* 直接沿用你 profile 的玻璃/掃光設計變體，避免再多加新 CSS 系統 */}
      <style>{`
        .bank-wrap { min-height: 100dvh; position: relative; padding: 24px; }
        .pf-bg::before { opacity: 0.9; }
        .bank-header { display:flex; justify-content: space-between; align-items:center; margin-bottom: 16px; }
        .bank-title { font-size: 22px; letter-spacing: 2px; color: #bfe9ff; text-shadow: 0 0 24px rgba(0,200,255,0.35); }
        .bank-grid { display:grid; grid-template-columns: 1.3fr 1fr; gap: 18px; align-items: start; }
        .bank-cards { display:grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 12px; }
        .bank-card { position:relative; padding:16px; border-radius:14px; background: rgba(16,18,24,0.5); backdrop-filter: blur(14px); border:1px solid rgba(180,220,255,0.08); box-shadow: 0 0 0 1px rgba(0,255,255,0.06) inset, 0 12px 40px rgba(0,0,0,0.35); overflow:hidden; }
        .bank-card .hint { font-size:12px; opacity:.8; }
        .bank-num { font-size: 22px; font-weight: 700; margin-top: 8px; color: #e6f7ff; text-shadow: 0 0 22px rgba(0,200,255,0.25); }
        .bank-sheen { position:absolute; inset:0; background: linear-gradient(120deg, transparent 0%, rgba(255,255,255,.08) 40%, transparent 60%); transform: translateX(-60%); animation: sheen 6s linear infinite; pointer-events: none; }
        @keyframes sheen { 0% { transform: translateX(-60%) } 50% { transform: translateX(60%)} 100% { transform: translateX(160%)} }
        .bank-form { display:grid; gap: 10px; }
        .bank-form .row { display:grid; grid-template-columns: 1fr 1fr; gap:10px; }
        .bank-form input { width:100%; background: rgba(255,255,255,0.04); border:1px solid rgba(180,220,255,0.12); border-radius:10px; padding:10px 12px; color:#e8f7ff; outline:none; }
        .bank-form input::placeholder { color: #9cb9c7; }
        .bank-form button { height:40px; border-radius:10px; background: linear-gradient(135deg, #00d1ff33, #7cf8ff22); border:1px solid rgba(0,230,255,0.35); color:#dffbff; font-weight:700; letter-spacing:.8px; }
        .bank-form button:disabled { opacity:.6 }
        .bank-section { padding:16px; border-radius:14px; background: rgba(16,18,24,0.5); backdrop-filter: blur(14px); border:1px solid rgba(180,220,255,0.08); box-shadow: 0 12px 40px rgba(0,0,0,0.35); }
        .bank-section h3 { margin:0 0 10px; font-size:14px; color:#bde8ff; letter-spacing:1px; }
        .bank-actions { display:grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .bank-his { margin-top: 12px; }
        .bank-item { display:flex; justify-content: space-between; gap:12px; padding:10px 12px; border-bottom:1px dashed rgba(150,200,255,.1); }
        .bank-item:last-child { border-bottom:0; }
        .bank-item .left { display:flex; flex-direction:column; gap:4px; }
        .bank-item .type { font-weight:700; font-size:13px; letter-spacing: .5px; }
        .bank-item .memo { font-size:12px; opacity:.8; color:#bcd7e6 }
        .bank-item .time { font-size:12px; opacity:.7; color:#9fb6c7 }
        .bank-item .amt { font-weight:800; }
        .in { color:#66f8a7; text-shadow: 0 0 12px rgba(80,255,160,0.35); }
        .out { color:#ff9c9c; text-shadow: 0 0 12px rgba(255,120,120,0.35); }
        .bank-loadmore { margin-top:10px; width:100%; height:40px; border-radius:10px; border:1px solid rgba(180,220,255,0.15); color:#d6f4ff; background:rgba(255,255,255,0.03); }
        .bank-topbar { display:flex; gap:10px; align-items:center; }
        .bank-topbar a { color:#aee8ff; }
        .pf-toast { position: fixed; right: 14px; bottom: 14px; padding: 10px 14px; border-radius: 10px; font-weight: 700; letter-spacing: .5px; }
        .pf-toast.ok { background: rgba(60, 255, 180, .18); border:1px solid rgba(60,255,180,.35); color:#d6ffef; }
        .pf-toast.err { background: rgba(255, 60, 60, .18); border:1px solid rgba(255,100,100,.35); color:#ffdede; }
        @media (max-width: 1100px) {
          .bank-grid { grid-template-columns: 1fr; }
          .bank-actions { grid-template-columns: 1fr; }
          .bank-cards { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* 背景（沿用 profile 的 pf-bg/pf-particles） */}
      <div className="pf-bg" />
      <div className="pf-particles" aria-hidden />

      <header className="bank-header">
        <div className="bank-topbar">
          <Link href="/" className="pf-logo">TOPZCASINO</Link>
          <span className="bank-title">BANK</span>
        </div>
        <nav>
          <Link href="/" className="pf-nav">大廳</Link>
          <Link href="/profile" className="pf-nav">個人</Link>
        </nav>
      </header>

      {/* 餘額卡片 */}
      <div className="bank-cards">
        <div className="bank-card pf-tilt">
          <div className="hint">錢包餘額</div>
          <div className="bank-num">{fmtAmount(balances?.wallet ?? 0)}</div>
          <div className="bank-sheen" />
        </div>
        <div className="bank-card pf-tilt">
          <div className="hint">銀行餘額</div>
          <div className="bank-num">{fmtAmount(balances?.bank ?? 0)}</div>
          <div className="bank-sheen" />
        </div>
        <div className="bank-card pf-tilt">
          <div className="hint">今日銀行流出 / 剩餘</div>
          <div className="bank-num">
            {fmtAmount(balances?.dailyOut ?? 0)} / {fmtAmount(dailyLeft)}
          </div>
          <div className="bank-sheen" />
        </div>
      </div>

      {/* 主體：表單 + 歷史 */}
      <div className="bank-grid">
        <section className="bank-section pf-tilt">
          <h3>操作</h3>
          <div className="bank-actions">
            {/* 存款 */}
            <form className="bank-form" onSubmit={onDeposit}>
              <div className="row">
                <input
                  inputMode="numeric"
                  placeholder="金額（整數）"
                  value={depAmt}
                  onChange={(e) => setDepAmt(e.target.value.replace(/[^\d]/g, ""))}
                />
                <input
                  placeholder="備註（選填）"
                  value={depMemo}
                  onChange={(e) => setDepMemo(e.target.value)}
                />
              </div>
              <button disabled={busy || loading} type="submit">存款（錢包 → 銀行）</button>
            </form>

            {/* 提領 */}
            <form className="bank-form" onSubmit={onWithdraw}>
              <div className="row">
                <input
                  inputMode="numeric"
                  placeholder="金額（整數）"
                  value={wdAmt}
                  onChange={(e) => setWdAmt(e.target.value.replace(/[^\d]/g, ""))}
                />
                <input
                  placeholder="備註（選填）"
                  value={wdMemo}
                  onChange={(e) => setWdMemo(e.target.value)}
                />
              </div>
              <button disabled={busy || loading} type="submit">提領（銀行 → 錢包）</button>
            </form>

            {/* 轉帳 */}
            <form className="bank-form" onSubmit={onTransfer}>
              <div className="row">
                <input
                  placeholder="對方使用者 ID"
                  value={tfTo}
                  onChange={(e) => setTfTo(e.target.value)}
                />
                <input
                  inputMode="numeric"
                  placeholder="金額（整數）"
                  value={tfAmt}
                  onChange={(e) => setTfAmt(e.target.value.replace(/[^\d]/g, ""))}
                />
              </div>
              <input
                placeholder="備註（選填）"
                value={tfMemo}
                onChange={(e) => setTfMemo(e.target.value)}
              />
              <button disabled={busy || loading} type="submit">轉帳（銀行 → 他人銀行）</button>
            </form>
          </div>
        </section>

        <section className="bank-section pf-tilt">
          <h3>最近紀錄</h3>
          <div className="bank-his">
            {history.length === 0 && <div className="lb-muted">尚無紀錄</div>}
            {history.map((it) => {
              const isOut = it.type === "WITHDRAW" || it.type === "TRANSFER";
              const sign = isOut ? "-" : "+";
              const klass = isOut ? "out" : "in";
              const when = new Date(it.createdAt);
              return (
                <div key={it.id} className="bank-item">
                  <div className="left">
                    <span className="type">{it.type} · {it.target}</span>
                    {it.memo && <span className="memo">{it.memo}</span>}
                    <span className="time">{when.toLocaleString()}</span>
                  </div>
                  <div className={`amt ${klass}`}>{sign}{fmtAmount(it.amount)}</div>
                </div>
              );
            })}
            {hasMore && (
              <button className="bank-loadmore" onClick={loadMore} disabled={busy || loading}>
                載入更多
              </button>
            )}
          </div>
        </section>
      </div>

      {toast && <div className={`pf-toast ${toast.type === "ok" ? "ok" : "err"}`}>{toast.text}</div>}
    </main>
  );
}
