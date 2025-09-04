'use client';

import { useState } from 'react';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const payload: Record<string, string> = {};
    fd.forEach((v, k) => (payload[k] = String(v)));

    const res = await fetch('/api/auth/login', { method: 'POST', body: JSON.stringify(payload), headers: { 'content-type': 'application/json' }});
    const data = await res.json();
    setLoading(false);
    if (!data.ok) {
      setErr(data.error ?? '登入失敗');
      return;
    }
    // 登入成功 → 回大廳
    location.href = '/';
  }

  return (
    <div className="auth-card" role="dialog" aria-label="Login">
      <h2 className="auth-title">登入</h2>
      <form onSubmit={onSubmit}>
        <div className="auth-field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="auth-field">
          <label htmlFor="password">密碼</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
        <button className="auth-btn" disabled={loading} aria-busy={loading}>
          {loading ? '登入中…' : '登入'}
        </button>
      </form>
      <div className="auth-links">
        <a href="/register">註冊新帳號</a>
        <a href="/forgot">忘記密碼？</a>
      </div>
      {err && <p style={{ marginTop: 10, color: '#fca5a5' }}>{err}</p>}
    </div>
  );
}
