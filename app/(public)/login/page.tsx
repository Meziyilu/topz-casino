// app/(public)/login/page.tsx
"use client";
import Head from "next/head";
import Link from "next/link";
import { useState } from "react";

export default function LoginPage() {
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const body: Record<string, string> = {};
    fd.forEach((v, k) => (body[k] = String(v)));

    const r = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });

    setLoading(false);
    if (r.ok) window.location.href = "/";
  }

  return (
    <>
      <Head>
        <link rel="preload" href="/styles/auth-theme.css" as="style" />
        <link rel="stylesheet" href="/styles/auth-theme.css" />
      </Head>

      <main className="tc-auth-card tc-follow">
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
              <input
                name="password"
                type={showPwd ? "text" : "password"}
                placeholder=" "
                required
                minLength={6}
              />
              <span className="tc-label">密碼</span>
              <button
                type="button"
                className="tc-eye"
                aria-label="顯示/隱藏密碼"
                onClick={() => setShowPwd((s) => !s)}
              >
                👁
              </button>
            </div>

            <div className="tc-row" style={{ justifyContent: "space-between" }}>
              <label className="tc-row" style={{ gap: 8 }}>
                <input type="checkbox" name="remember" />
                記住我
              </label>
              <Link href="/forgot" className="tc-link">忘記密碼？</Link>
            </div>

            <button className="tc-btn" disabled={loading}>
              {loading ? "登入中…" : "登入"}
            </button>

            <div className="tc-sep"></div>
            <div className="tc-hint">
              還沒有帳號？<Link className="tc-link" href="/register">前往註冊</Link>
            </div>
          </form>
        </div>
      </main>
    </>
  );
}
