// app/(public)/register/page.tsx
"use client";

import Link from "next/link";
import { useState } from "react";

export default function RegisterPage() {
  const [showPwd, setShowPwd] = useState(false);
  const [showPwd2, setShowPwd2] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErr(null);

    const fd = new FormData(e.currentTarget);
    const body: Record<string, string> = {};
    fd.forEach((v, k) => (body[k] = String(v)));

    // 基本前端檢查（可再用 zod 強化）
    if (!body.email || !body.password || !body.displayName) {
      setErr("請完整填寫必填欄位");
      setLoading(false);
      return;
    }
    if (body.password !== body.confirmPassword) {
      setErr("兩次輸入的密碼不一致");
      setLoading(false);
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(body.email)) {
      setErr("Email 格式不正確");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: body.email.trim().toLowerCase(),
          password: body.password,
          displayName: body.displayName.trim(),
          referralCode: body.referralCode?.trim() || undefined,
          // 後端若有需要 isOver18 / acceptTOS 再放；目前不驗證 email。
        }),
        credentials: "include",
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setErr(d?.error ?? "註冊失敗");
        setLoading(false);
        return;
      }

      // 註冊成功 → 導回大廳（首頁）
      window.location.href = "/";
    } catch (e) {
      setErr("連線失敗，請稍後再試");
      setLoading(false);
    }
  }

  return (
    <main className="tc-auth-card tc-follow">
      {/* 套用與 Login 相同的 CSS 主題 */}
      <link rel="stylesheet" href="/styles/auth-theme.css" />

      <div className="tc-card-inner">
        {/* 置中大字 LOGO（與登入一致） */}
        <div className="tc-brand">TOPZCASINO</div>

        {/* 分頁切換 */}
        <div className="tc-tabs">
          <Link href="/login" className="tc-tab">登入</Link>
          <Link href="/register" className="tc-tab active" aria-current="page">註冊</Link>
        </div>

        {/* 表單 */}
        <form className="tc-grid" onSubmit={onSubmit} noValidate>
          {/* 顯示名稱 */}
          <div className="tc-input">
            <input
              name="displayName"
              type="text"
              placeholder=" "
              required
              minLength={2}
              maxLength={20}
              aria-label="暱稱"
            />
            <span className="tc-label">玩家暱稱（2–20字）</span>
          </div>

          {/* Email */}
          <div className="tc-input">
            <input
              name="email"
              type="email"
              placeholder=" "
              required
              aria-label="電子信箱"
            />
            <span className="tc-label">電子信箱</span>
          </div>

          {/* 密碼 */}
          <div className="tc-input">
            <input
              name="password"
              type={showPwd ? "text" : "password"}
              placeholder=" "
              required
              minLength={6}
              aria-label="密碼"
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

          {/* 確認密碼 */}
          <div className="tc-input">
            <input
              name="confirmPassword"
              type={showPwd2 ? "text" : "password"}
              placeholder=" "
              required
              minLength={6}
              aria-label="確認密碼"
            />
            <span className="tc-label">確認密碼</span>
            <button
              type="button"
              className="tc-eye"
              aria-label="顯示/隱藏密碼"
              onClick={() => setShowPwd2((s) => !s)}
            >
              👁
            </button>
          </div>

          {/* 邀請碼（選填） */}
          <div className="tc-input">
            <input
              name="referralCode"
              type="text"
              placeholder=" "
              aria-label="邀請碼（選填）"
            />
            <span className="tc-label">邀請碼（選填）</span>
          </div>

          {/* 錯誤訊息 */}
          {err && <div className="tc-error">{err}</div>}

          {/* 送出 */}
          <button className="tc-btn" disabled={loading}>
            {loading ? "註冊中…" : "建立帳號"}
          </button>

          <div className="tc-sep"></div>
          <div className="tc-hint">
            已有帳號？<Link className="tc-link" href="/login">前往登入</Link>
          </div>
        </form>
      </div>
    </main>
  );
}
