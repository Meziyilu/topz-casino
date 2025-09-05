// app/(public)/login/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    try {
      const fd = new FormData(e.currentTarget);
      const body: Record<string, string> = {};
      fd.forEach((v, k) => (body[k] = String(v)));

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include", // 重要：讓後端 Set-Cookie 生效
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErr(
          data?.error === "INVALID_CREDENTIALS"
            ? "帳號或密碼錯誤"
            : data?.error === "ACCOUNT_BANNED"
            ? "此帳號已被停權"
            : "登入失敗，請稍後再試"
        );
        setLoading(false);
        return;
      }

      // 登入成功 → 進大廳
      router.replace("/lobby");
    } catch (e) {
      setErr("網路錯誤，請稍後再試");
      setLoading(false);
    }
  }

  return (
    <>
      {/* 掛入你的深色玻璃感樣式（位於 public/styles/auth-theme.css） */}
      <link rel="stylesheet" href="/styles/auth-theme.css" />

      <main className="tc-auth-card tc-follow">
        <div className="tc-card-inner">
          {/* 置中大字 LOGO */}
          <div className="tc-brand">TOPZCASINO</div>

          {/* 分頁切換 */}
          <div className="tc-tabs">
            <Link href="/login" className="tc-tab active" aria-current="page">
              登入
            </Link>
            <Link href="/register" className="tc-tab">
              註冊
            </Link>
          </div>

          <form className="tc-grid" onSubmit={onSubmit} noValidate>
            {err && <div className="tc-error" role="alert">{err}</div>}

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

            <div className="tc-row" style={{ justifyContent: "space-between" }}>
              <label className="tc-row" style={{ gap: 8 }}>
                <input type="checkbox" name="remember" />
                記住我
              </label>
              <Link href="/forgot" className="tc-link">
                忘記密碼？
              </Link>
            </div>

            <button className="tc-btn" disabled={loading}>
              {loading ? "登入中…" : "登入"}
            </button>

            <div className="tc-sep"></div>
            <div className="tc-hint">
              還沒有帳號？{" "}
              <Link className="tc-link" href="/register">
                前往註冊
              </Link>
            </div>
          </form>
        </div>
      </main>
    </>
  );
}
