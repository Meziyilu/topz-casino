// app/(public)/register/page.tsx
"use client";
import Link from "next/link";
import { useState } from "react";

export default function RegisterPage() {
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const body: Record<string, string> = {};
    fd.forEach((v, k) => (body[k] = String(v)));
    await fetch("/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    setLoading(false);
    window.location.href = "/login";
  }

  return (
    <main className="tc-auth-card tc-follow">
      <div className="tc-card-inner">
        {/* 置中大字 LOGO */}
        <div className="tc-brand">TOPZCASINO</div>

        {/* 分頁切換 */}
        <div className="tc-tabs">
          <Link href="/login" className="tc-tab">登入</Link>
          <Link href="/register" className="tc-tab active" aria-current="page">註冊</Link>
        </div>

        <form className="tc-grid" onSubmit={onSubmit} noValidate>
          <div className="tc-input">
            <input name="displayName" placeholder=" " required minLength={2} maxLength={20} />
            <span className="tc-label">玩家暱稱</span>
          </div>

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
            <span className="tc-label">密碼（至少 6 碼）</span>
            <button
              type="button"
              className="tc-eye"
              aria-label="顯示/隱藏密碼"
              onClick={() => setShowPwd((s) => !s)}
            >
              👁
            </button>
          </div>

          <div className="tc-input">
            <input name="referralCode" placeholder=" " />
            <span className="tc-label">邀請碼（選填）</span>
          </div>

          <div className="tc-row">
            <label className="tc-row" style={{ gap: 8 }}>
              <input type="checkbox" name="isOver18" required />
              我已年滿 18 歲
            </label>
          </div>

          <div className="tc-row">
            <label className="tc-row" style={{ gap: 8 }}>
              <input type="checkbox" name="acceptTOS" required />
              我同意服務條款
            </label>
          </div>

          <button className="tc-btn" disabled={loading}>
            {loading ? "建立中…" : "建立帳號"}
          </button>

          <div className="tc-sep"></div>
          <div className="tc-hint">
            已有帳號？<Link className="tc-link" href="/login">返回登入</Link>
          </div>
        </form>
      </div>
    </main>
  );
}
