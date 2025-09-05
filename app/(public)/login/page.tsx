"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// 直接連 public 的 CSS（Render/生產環境最穩）
const AuthCSS = () => <link rel="stylesheet" href="/styles/auth-theme.css" />;

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();            // ✅ 放在 Suspense 內
  const next = params.get("next") || "/";      // 預設回到大廳（app/page.tsx）

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });

    setLoading(false);

    if (res.ok) {
      router.replace(next);                    // ✅ 登入成功 → 回大廳/next
    } else {
      const data = await res.json().catch(() => ({}));
      setErr(data?.error || "登入失敗");
    }
  }

  return (
    <main className="tc-auth-card tc-follow">
      <AuthCSS />
      <div className="tc-card-inner">
        <div className="tc-brand">TOPZCASINO</div>

        <div className="tc-tabs">
          <a className="tc-tab active" aria-current="page">登入</a>
          <a className="tc-tab" href="/register">註冊</a>
        </div>

        {err && <div className="tc-error">{err}</div>}

        <form className="tc-grid" onSubmit={onSubmit} noValidate>
          <div className="tc-input">
            <input
              name="email"
              type="email"
              placeholder=" "
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <span className="tc-label">電子信箱</span>
          </div>

          <div className="tc-input">
            <input
              name="password"
              type="password"
              placeholder=" "
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <span className="tc-label">密碼</span>
          </div>

          <div className="tc-row" style={{ justifyContent: "space-between" }}>
            <label className="tc-row" style={{ gap: 8 }}>
              <input type="checkbox" name="remember" />
              記住我
            </label>
            <a href="/forgot" className="tc-link">忘記密碼？</a>
          </div>

          <button className="tc-btn" disabled={loading}>
            {loading ? "登入中…" : "登入"}
          </button>

          <div className="tc-sep"></div>
          <div className="tc-hint">
            還沒有帳號？<a className="tc-link" href="/register">前往註冊</a>
          </div>
        </form>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <main className="tc-auth-card tc-follow">
        <AuthCSS />
        <div className="tc-card-inner">載入中…</div>
      </main>
    }>
      <LoginInner />
    </Suspense>
  );
}
