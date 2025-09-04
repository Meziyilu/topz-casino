// app/(public)/register/page.tsx
"use client";

import Link from "next/link";

export default function RegisterPage() {
  return (
    <section className="tc-auth-card tc-follow">
      <div className="tc-card-inner">
        {/* Tabs */}
        <nav className="tc-tabs is-register">
          <Link className="tc-tab" href="/login">登入</Link>
          <Link className="tc-tab" href="/register">註冊</Link>
        </nav>

        <form method="POST" action="/api/auth/register" noValidate>
          <div className="tc-grid">
            <div className="tc-input">
              <div className="tc-label">玩家暱稱（2–20字）</div>
              <input name="displayName" type="text" minLength={2} maxLength={20} autoComplete="nickname" required />
            </div>

            <div className="tc-input">
              <div className="tc-label">電子信箱</div>
              <input name="email" type="email" inputMode="email" autoComplete="email" required />
            </div>

            <div className="tc-input" style={{ position: "relative" }}>
              <div className="tc-label">密碼（至少 8 碼）</div>
              <input name="password" type="password" minLength={8} autoComplete="new-password" required />
              <button className="tc-eye" type="button" aria-label="顯示/隱藏密碼">👁</button>
            </div>

            <div className="tc-input">
              <div className="tc-label">邀請碼（選填）</div>
              <input name="referralCode" type="text" maxLength={24} />
            </div>
          </div>

          <div className="tc-row" style={{ marginTop: 10 }}>
            <label className="tc-hint" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <input name="isOver18" type="checkbox" required /> 我已年滿 18 歲
            </label>
            <label className="tc-hint" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <input name="acceptTOS" type="checkbox" required /> 我同意服務條款
            </label>
          </div>

          <div className="tc-sep" />
          <button className="tc-btn" type="submit" style={{ marginTop: 10 }}>
            建立帳號
          </button>

          <p className="tc-hint" style={{ textAlign: "center", marginTop: 10 }}>
            已經有帳號？<Link className="tc-link" href="/login">前往登入</Link>
          </p>
        </form>
      </div>
    </section>
  );
}
