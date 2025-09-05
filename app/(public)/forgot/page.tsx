"use client";

import Link from "next/link";
import { useState } from "react";

export default function ForgotPage() {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

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
    });

    setLoading(false);
    setDone(res.ok);
    if (!res.ok) {
      const msg = await res.text().catch(() => "");
      alert(`送出失敗：${msg || "請稍後再試"}`);
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

        {done ? (
          <div className="tc-hint" style={{ textAlign: "center", padding: "12px 0" }}>
            若信箱存在，我們已建立重設流程。請至信箱（或使用內建 reset 測試連結）完成重設。
          </div>
        ) : (
          <form className="tc-grid" onSubmit={onSubmit} noValidate>
            <div className="tc-input">
              <input name="email" type="email" placeholder=" " required />
              <span className="tc-label">電子信箱</span>
            </div>

            <button className="tc-btn" disabled={loading}>
              {loading ? "送出中…" : "建立重設流程"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
