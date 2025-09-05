"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// 讓此頁不要在 build 時預先靜態產生，避免 CSR bailout
export const dynamic = "force-dynamic";

function LoginInner() {
  const router = useRouter();
  const search = useSearchParams();             // ✅ 這裡可安全使用
  const next = search?.get("next") || "/";

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
      body: JSON.stringify(body),
      credentials: "include",
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErr(data?.error || "登入失敗");
      setLoading(false);
      return;
    }

    router.push(next); // ✅ 登入成功導回大廳（/），或 ?next=...
  }

  return (
    <main className="tc-auth-card tc-follow">
      <div className="tc-card-inner">
        {/* 置中大字 LOGO */}
        <div className="tc-brand">TOPZCASINO</div>

        {/* 分頁切換 */}
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

          {err && <p className="tc-error">{err}</p>}

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

      {/* 確保樣式載入（深色玻璃感） */}
      <link rel="stylesheet" href="/styles/auth-theme.css" />
    </main>
  );
}

export default function LoginPage() {
  // ✅ 用 Suspense 包住內層元件，符合 Next 的要求
  return (
    <Suspense fallback={<div style={{ color: "#fff", textAlign: "center", paddingTop: 40 }}>載入中…</div>}>
      <LoginInner />
    </Suspense>
  );
}
