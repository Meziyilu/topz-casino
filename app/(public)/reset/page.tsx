"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function ResetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token") || "";
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState(tokenFromUrl);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const body: Record<string, string> = {};
    fd.forEach((v, k) => (body[k] = String(v)));
    body.token = token || body.token || "";

    const res = await fetch("/api/auth/reset", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      credentials: "include",
    });

    setLoading(false);

    if (res.ok) {
      alert("已重設密碼，請使用新密碼登入。");
      router.push("/login");
    } else {
      alert("重設失敗，請確認連結是否有效或稍後再試。");
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
          <span className="tc-tab active" aria-current="page">重設密碼</span>
        </div>

        <form className="tc-grid" onSubmit={onSubmit} noValidate>
          {/* Token 可由連結帶入，也提供欄位手動貼上 */}
          <div className="tc-input">
            <input
              name="token"
              placeholder=" "
              required
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
            <span className="tc-label">重設 Token</span>
          </div>

          <div className="tc-input">
            <input
              name="newPassword"
              type={showPwd ? "text" : "password"}
              placeholder=" "
              required
              minLength={6}
            />
            <span className="tc-label">新密碼</span>
            <button
              type="button"
              className="tc-eye"
              aria-label="顯示/隱藏密碼"
              onClick={() => setShowPwd((s) => !s)}
            >
              👁
            </button>
          </div>

          <button className="tc-btn" disabled={loading}>
            {loading ? "變更中…" : "變更密碼"}
          </button>

          <div className="tc-sep" />
          <div className="tc-hint">
            完成了？<Link className="tc-link" href="/login">回登入</Link>
          </div>
        </form>
      </div>
    </main>
  );
}

// ✅ 用 Suspense 包 useSearchParams，避免 SSR build 錯誤
export default function Page() {
  return (
    <Suspense fallback={null}>
      <ResetForm />
    </Suspense>
  );
}
