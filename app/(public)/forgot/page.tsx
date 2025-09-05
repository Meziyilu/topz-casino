"use client";

import Link from "next/link";
import { Suspense, useState } from "react";

function ForgotForm() {
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const body: Record<string, string> = {};
    fd.forEach((v, k) => (body[k] = String(v)));

    const res = await fetch("/api/auth/forgot", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      credentials: "include",
    });

    setLoading(false);

    if (res.ok) {
      alert("如果此信箱存在，我們已寄出重設連結。請查收信箱（或收件匣/垃圾郵件）。");
    } else {
      alert("送出失敗，請稍後再試。");
    }
  }

  return (
    <main className="tc-auth-card tc-follow">
      <link rel="stylesheet" href="/styles/auth-theme.css" />

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

          <button className="tc-btn" disabled={loading}>
            {loading ? "送出中…" : "寄送重設連結"}
          </button>

          <div className="tc-sep" />
          <div className="tc-hint">
            想起來了？<Link className="tc-link" href="/login">回登入</Link>
          </div>
        </form>
      </div>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ForgotForm />
    </Suspense>
  );
}
