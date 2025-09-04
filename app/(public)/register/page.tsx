'use client';

import { useState } from 'react';

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const payload: Record<string, string> = {};
    fd.forEach((v, k) => (payload[k] = String(v)));

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'content-type': 'application/json' },
    });
    const data = await res.json();
    setLoading(false);
    if (!data.ok) { setErr(data.error ?? '註冊失敗'); return; }
    location.href = '/login';
  }

  return (
    <div className="auth-card" role="dialog" aria-label="Register">
      <h2 className="auth-title">註冊</h2>
      <form onSubmit={onSubmit}>
        <div className="auth-field">
          <label htmlFor="displayName">暱稱</label>
          <input id="displayName" name="displayName" minLength={2} maxLength={20} required />
        </div>
        <div className="auth-field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="auth-field">
          <label htmlFor="password">密碼</label>
          <input id="password" name="password" type="password" autoComplete="new-password" required />
        </div>
        <div className="auth-field">
          <label htmlFor="referralCode">邀請碼（選填）</label>
          <input id="referralCode" name="referralCode" placeholder="可不填" />
        </div>
        <div className="auth-field" style={{ marginTop: 8 }}>
          <label><input type="checkbox" name="isOver18" value="true" required /> 我已年滿 18 歲</label>
          <label><input type="checkbox" name="acceptTOS" value="true" required /> 我同意服務條款</label>
        </div>
        <button className="auth-btn" disabled={loading} aria-busy={loading}>
          {loading ? '註冊中…' : '建立帳號'}
        </button>
      </form>
      <div className="auth-links">
        <a href="/login">已有帳號？去登入</a>
        <span />
      </div>
      {err && <p style={{ marginTop: 10, color: '#fca5a5' }}>{err}</p>}
    </div>
  );
}
