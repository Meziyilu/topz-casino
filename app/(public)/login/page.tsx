// app/(public)/login/page.tsx
"use client";

import Link from "next/link";

export default function LoginPage() {
  return (
    <section className="tc-auth-card tc-follow">
      <div className="tc-card-inner">
        {/* Tabs */}
        <nav className="tc-tabs is-login">
          <Link className="tc-tab" href="/login">登入</Link>
          <Link className="tc-tab" href="/register">註冊</Link>
        </nav>

        <form method="POST" action="/api/auth/login" noValidate>
          <div className="tc-grid">
            <div className="tc-input">
              <div className="tc-label">電子信箱</div>
              <input name="email" type="email" inputMode="email" autoComplete="email" required />
            </div>

            <div className="tc-input" style={{ position: "relative" }}>
              <div className="tc-label">密碼</div>
              <input name="password" type="password" autoComplete="current-password" required />
              <button className="tc-eye" type="button" aria-label="顯示/隱藏密碼">👁</button>
            </div>
          </div>

          <div className="tc-row" style={{ marginTop: 10 }}>
            <label className="tc-hint" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <input name="remember" type="checkbox" />
              記住我
            </label>
            <Link href="/forgot" className="tc-link">忘記密碼？</Link>
          </div>

          <div className="tc-sep" />
          <button className="tc-btn" type="submit" style={{ marginTop: 10 }}>
            立即登入
          </button>

          <p className="tc-hint" style={{ textAlign: "center", marginTop: 10 }}>
            還沒有帳號？<Link className="tc-link" href="/register">前往註冊</Link>
          </p>
        </form>
      </div>
    </section>
  );
}
