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

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      credentials: "include",
    });

    setLoading(false);
    if (res.ok) {
      // 直接導大廳
      window.location.href = "/";
    } else {
      alert("註冊失敗，請檢查欄位");
    }
  }

  return (
    <main className="tc-auth-wrap">
      <div className="tc-bg-glow" />
      <div className="tc-particles" aria-hidden />
      <div className="tc-auth-card tc-follow">
        <div className="tc-card-inner">

          <div className="tc-brand">TOPZCASINO</div>

          <div className="tc-tabs">
            <Link href="/login" className="tc-tab">登入</Link>
            <Link href="/register" className="tc-tab active" aria-current="page">註冊</Link>
          </div>

          <form className="tc-form" onSubmit={onSubmit} noValidate>
            <div className="tc-input">
              <input name="email" type="email" placeholder=" " required />
              <span className="tc-label">電子信箱</span>
            </div>

            <div className="tc-input">
              <input name="displayName" placeholder=" " required minLength={2} maxLength={20} />
              <span className="tc-label">玩家暱稱</span>
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

            <div className="tc-row between">
              <label className="tc-row" style={{ gap: 8 }}>
                <input type="checkbox" name="acceptTOS" required />
                我已閱讀並同意服務條款
              </label>
            </div>

            <button className="tc-btn" disabled={loading}>
              {loading ? "送出中…" : "建立帳號"}
            </button>

            <div className="tc-sep" />
            <div className="tc-hint">
              已有帳號？<Link className="tc-link" href="/login">前往登入</Link>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
