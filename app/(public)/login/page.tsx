'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password: pwd }),
      });
      if (!res.ok) throw new Error(await res.text());
      // 登入成功 → 導回大廳
      window.location.href = '/';
    } catch (e: any) {
      setErr(e?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-center">
      <div className="auth-card">
        <h1 className="auth-title">登入</h1>
        <p className="auth-sub">歡迎回來</p>

        <form onSubmit={onSubmit} className="auth-form">
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
              autoComplete="current-password"
              required
            />
          </label>

          {err && <div className="auth-error">{err}</div>}

          <button className="auth-btn" disabled={loading}>
            {loading ? '登入中…' : '登入'}
          </button>
        </form>

        <div className="auth-footer">
          <Link href="/register" className="auth-link">沒有帳號？前往註冊</Link>
          <Link href="/forgot" className="auth-link">忘記密碼</Link>
        </div>
      </div>
    </section>
  );
}
