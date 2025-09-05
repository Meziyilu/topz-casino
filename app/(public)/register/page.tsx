"use client";
import { useState } from "react";
import Link from "next/link";

export default function RegisterPage() {
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const fd = new FormData(e.currentTarget);
      const body: Record<string, string> = {};
      fd.forEach((v, k) => (body[k] = String(v)));
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErr(data?.error === 'DUPLICATE' ? 'Email 或暱稱已被使用' : '註冊失敗');
        setLoading(false);
        return;
      }
      setOk(true);
      setLoading(false);
      // 註冊後跳去登入
      setTimeout(() => window.location.assign('/login'), 800);
    } catch {
      setErr('網路錯誤，請稍後再試');
      setLoading(false);
    }
  }

  return (
    <>
      <link rel="stylesheet" href="/styles/auth-theme.css" />
      <main className="tc-auth-card tc-follow">
        <div className="tc-card-inner">
          <div className="tc-brand">TOPZCASINO</div>

          <div className="tc-tabs">
            <Link href="/login" className="tc-tab">登入</Link>
            <Link href="/register" className="tc-tab active" aria-current="page">註冊</Link>
          </div>

          <form className="tc-grid" onSubmit={onSubmit} noValidate>
            {err && <div className="tc-error" role="alert">{err}</div>}
            {ok && <div className="tc-ok" role="status">註冊成功，前往登入…</div>}

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
              <button type="button" className="tc-eye" onClick={() => setShowPwd(s => !s)}>👁</button>
            </div>

            <div className="tc-input">
              <input name="referralCode" placeholder=" " />
              <span className="tc-label">邀請碼（選填）</span>
            </div>

            <button className="tc-btn" disabled={loading}>
              {loading ? '註冊中…' : '建立帳號'}
            </button>

            <div className="tc-sep"></div>
            <div className="tc-hint">
              已經有帳號？<Link className="tc-link" href="/login">前往登入</Link>
            </div>
          </form>
        </div>
      </main>
    </>
  );
}
