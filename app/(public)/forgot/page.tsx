"use client";
import { useState } from "react";
import Link from "next/link";

export default function ForgotPage() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const body: Record<string, string> = {};
    fd.forEach((v, k) => (body[k] = String(v)));

    try {
      const res = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: body.email?.trim().toLowerCase() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErr(data?.error ?? "REQUEST_FAILED");
      } else {
        setMsg("如果信箱存在，我們已寄送重設連結（此環境會在伺服器日誌輸出連結）。");
      }
    } catch {
      setErr("NETWORK_ERROR");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="tc-auth-card tc-follow">
      <div className="tc-card-inner">
        <div className="tc-brand">TOPZCASINO</div>

        <div className="tc-tabs">
          <Link href="/login" className="tc-tab">登入</Link>
          <Link href="/register" className="tc-tab">註冊</Link>
          <span className="tc-tab active" aria-current="page">忘記密碼</span>
        </div>

        <form className="tc-grid" onSubmit={onSubmit} noValidate>
          <div className="tc-input">
            <input name="email" type="email" placeholder=" " required />
            <span className="tc-label">註冊信箱</span>
          </div>

          {err && <div className="tc-error">{err}</div>}
          {msg && <div className="tc-ok">{msg}</div>}

          <button className="tc-btn" disabled={loading}>
            {loading ? "送出中…" : "寄送重設連結"}
          </button>

          <div className="tc-sep" />
          <div className="tc-hint">
            想起密碼了？<Link className="tc-link" href="/login">回登入</Link>
          </div>
        </form>
      </div>

      {/* 這一行是關鍵：從 public/ 載入樣式 */}
      <link rel="stylesheet" href="/styles/auth-theme.css" />
    </main>
  );
}
