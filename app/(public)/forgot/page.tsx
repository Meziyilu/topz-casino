// app/(public)/forgot/page.tsx
"use client";
import Link from "next/link";
import { useState } from "react";
import "../auth-theme.css";

export default function ForgotPage() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [resetUrl, setResetUrl] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    setResetUrl(null);

    const fd = new FormData(e.currentTarget);
    const body: Record<string, string> = {};
    fd.forEach((v, k) => (body[k] = String(v)));

    const res = await fetch("/api/auth/forgot", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setLoading(false);

    if (data.ok) {
      setMsg("若帳號存在，已建立重設連結。");
      if (data.resetUrl) setResetUrl(data.resetUrl); // 方便測試
    } else {
      setMsg(data.msg || "發生錯誤");
    }
  }

  return (
    <main className="tc-auth-card tc-follow">
      <div className="tc-card-inner">
        {/* 置中文字 LOGO */}
        <div className="tc-brand">TOPZCASINO</div>

        {/* 分頁切換 */}
        <div className="tc-tabs">
          <Link href="/login" className="tc-tab">登入</Link>
          <Link href="/register" className="tc-tab">註冊</Link>
          <span className="tc-tab active" aria-current="page">忘記密碼</span>
        </div>

        <form className="tc-grid" onSubmit={onSubmit} noValidate>
          <div className="tc-input">
            <input name="email" type="email" placeholder=" " required />
            <span className="tc-label">註冊用 Email</span>
          </div>

          <button className="tc-btn" disabled={loading}>
            {loading ? "建立連結中…" : "寄送重設連結"}
          </button>

          {msg && <div className="tc-hint" style={{ marginTop: 8 }}>{msg}</div>}
          {resetUrl && (
            <div className="tc-hint" style={{ marginTop: 4 }}>
              測試用重設連結：<a href={resetUrl} className="tc-link">{resetUrl}</a>
            </div>
          )}

          <div className="tc-sep"></div>
          <div className="tc-hint">
            記起來了？<Link href="/login" className="tc-link">返回登入</Link>
          </div>
        </form>
      </div>
    </main>
  );
}
