// app/(public)/login/page.tsx
"use client";
import Link from "next/link";
import { useState } from "react";

export default function LoginPage() {
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    const fd = new FormData(e.currentTarget);
    const body: Record<string, string> = {};
    fd.forEach((v, k) => (body[k] = String(v)));

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",                // ✅ 一定要帶，確保 cookie 寫回
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setErr(d?.error || "登入失敗");
      setLoading(false);
      return;
    }
    window.location.href = "/"; // 進大廳（首頁）
  }

  return (
    <main className="tc-auth-card tc-follow">
      <link rel="stylesheet" href="/styles/auth-theme.css" />
      <div className="tc-card-inner">
        <div className="tc-brand">TOPZCASINO</div>

        <div className="tc-tabs">
          <Link href="/login" className="tc-tab active" aria-current="page">登入</Link>
          <Link href="/register" className="tc-tab">註冊</Link>
        </div>

        <form className="tc-grid" onSubmit={onSubmit} noValidate>
          <div className="tc-input">
            <input name="email" type="email" placeholder=" " required />
            <span className="tc-label">電子信箱</span>
          </div>

          <div className="tc-input">
            <input name="password" type={showPwd ? "text" : "password"} placeholder=" " required minLength={6} />
            <span className="tc-label">密碼</span>
            <button type="button" className="tc-eye" onClick={() => setShowPwd(s => !s)}>👁</button>
          </div>

          {err && <div className="tc-error">{String(err)}</div>}

          <button className="tc-btn" disabled={loading}>{loading ? "登入中…" : "登入"}</button>

          <div className="tc-sep"></div>
          <div className="tc-hint">還沒有帳號？<Link className="tc-link" href="/register">前往註冊</Link></div>
        </form>
      </div>
    </main>
  );
}
