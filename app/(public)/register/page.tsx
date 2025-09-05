"use client";

import Link from "next/link";
import { useState } from "react";

export default function RegisterPage() {
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const body: Record<string, string> = {};
    fd.forEach((v, k) => (body[k] = String(v)));

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: body.email?.trim().toLowerCase(),
          password: body.password ?? "",
          displayName: body.displayName ?? "",
          referralCode: body.referralCode || undefined,
          isOver18: body.isOver18 === "on",
          acceptTOS: body.acceptTOS === "on",
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErr(data?.error ?? "REGISTER_FAILED");
      } else {
        // 成功 → 回到大廳（/）
        window.location.href = "/";
      }
    } catch {
      setErr("NETWORK_ERROR");
    } finally {
      setLoading(false);
    }
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
            <input name="displayName" type="text" placeholder=" " required minLength={2} maxLength={20} />
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
            <input name="referralCode" type="text" placeholder=" " />
            <span className="tc-label">邀請碼（選填）</span>
          </div>

          <label className="tc-row" style={{ gap: 10 }}>
            <input type="checkbox" name="isOver18" required />
            我已年滿 18 歲
          </label>

          <label className="tc-row" style={{ gap: 10 }}>
            <input type="checkbox" name="acceptTOS" required />
            我同意服務條款與隱私權政策
          </label>

          {err && <div className="tc-error">{err}</div>}

          <button className="tc-btn" disabled={loading}>
            {loading ? "建立中…" : "建立帳號"}
          </button>

          <div className="tc-sep" />
          <div className="tc-hint">
            已經有帳號？<Link className="tc-link" href="/login">回登入</Link>
          </div>
        </form>
      </div>
      <link rel="stylesheet" href="/styles/auth-theme.css" />
    </main>
  );
}
