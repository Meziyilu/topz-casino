'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [pwd, setPwd] = useState('');
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setOk(null);
    if (!agree) return setErr('請勾選同意服務條款');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password: pwd, displayName, isOver18: true, acceptTOS: true }),
      });
      if (!res.ok) throw new Error(await res.text());
      setOk('註冊成功，請至信箱點擊驗證連結後再登入。');
    } catch (e: any) {
      setErr(e?.message || 'Register failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-center">
      <div className="auth-card">
        <h1 className="auth-title">註冊</h1>
        <p className="auth-sub">建立你的 TOPZCASINO 帳號</p>

        <form onSubmit={onSubmit} className="auth-form">
          <label className="auth-label">
            <span>暱稱（2–20字）</span>
            <input
              className="auth-input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              minLength={2}
              maxLength={20}
              required
            />
          </label>

          <label className="auth-label">
            <span>電子郵件</span>
            <input
              className="auth-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </label>

          <label className="auth-label">
            <span>密碼</span>
            <input
              className="auth-input"
              type="password"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>

          <label className="auth-check">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            <span>我已年滿 18 歲並同意服務條款</span>
          </label>

          {err && <div className="auth-error">{err}</div>}
          {ok && <div className="auth-ok">{ok}</div>}

          <button className="auth-btn" disabled={loading}>
            {loading ? '建立中…' : '建立帳號'}
          </button>
        </form>

        <div className="auth-footer">
          <Link href="/login" className="auth-link">已有帳號？前往登入</Link>
        </div>
      </div>
    </section>
  );
}
