"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const body: Record<string, string> = {};
    fd.forEach((v, k) => (body[k] = String(v)));

    // 勾選欄位補齊（沒勾時不會在 FormData 裡）
    body.isOver18 = String(!!fd.get("isOver18"));
    body.acceptTOS = String(!!fd.get("acceptTOS"));

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      credentials: "include",
    });

    setLoading(false);

    if (res.ok) {
      // 你目前是關掉 Email 驗證，所以註冊後導回 /login
      const next = searchParams.get("next") || "/login";
      router.push(next);
    } else {
      const msg = await res.text().catch(() => "");
      alert(`註冊失敗：${msg || "請檢查輸入內容"}`);
    }
  }

  return (
    <main className="tc-auth-card tc-follow">
      {/* ✅ 吃 public/styles/auth-theme.css */}
      <link rel="stylesheet" href="/styles/auth-theme.css" />

      <div className="tc-card-inner">
        {/* LOGO */}
        <div className="tc-brand">TOPZCASINO</div>

        {/* Tabs */}
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

          <div className="tc-input">
            <input name="referralCode" placeholder=" " />
            <span className="tc-label">邀請碼（選填）</span>
          </div>

          <label className="tc-row" style={{ gap: 10 }}>
            <input type="checkbox" name="isOver18" required />
            我已滿 18 歲
          </label>

          <label className="tc-row" style={{ gap: 10 }}>
            <input type="checkbox" name="acceptTOS" required />
            我同意服務條款與隱私政策
          </label>

          <button className="tc-btn" disabled={loading}>
            {loading ? "註冊中…" : "建立帳號"}
          </button>

          <div className="tc-sep" />
          <div className="tc-hint">
            已有帳號？<Link className="tc-link" href="/login">返回登入</Link>
          </div>
        </form>
      </div>
    </main>
  );
}

// ✅ 用 Suspense 包 useSearchParams
export default function Page() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}
