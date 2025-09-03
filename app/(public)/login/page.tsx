// app/(public)/login/page.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pwd }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setErr(data?.message ?? '登入失敗'); setLoading(false); return;
      }
      router.push('/'); // 登入成功導回大廳
    } catch (e) {
      setErr('連線異常，請稍後再試'); setLoading(false);
    }
  }

  return (
    <div className="auth-card" role="dialog" aria-labelledby="login-title">
      <div className="card-head">
        <div className="card-title" id="login-title">登入</div>
        <div className="card-sub">歡迎回來，請使用您的帳號登入</div>
      </div>

      {err && <div className="error">{err}</div>}

      <form className="form" onSubmit={onSubmit} noValidate>
        <div className="field">
          <label className="label" htmlFor="email">Email</label>
          <input
            id="email" className="input" type="email" placeholder="you@example.com"
            value={email} onChange={(e) => setEmail(e.target.value)} required
            autoComplete="email"
          />
        </div>

        <div className="field">
          <label className="label" htmlFor="password">密碼</label>
          <input
            id="password" className="input" type="password" placeholder="••••••••"
            value={pwd} onChange={(e) => setPwd(e.target.value)} required
            autoComplete="current-password"
          />
        </div>

        <div className="row">
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? '登入中…' : '登入'}
          </button>
          <a className="hint" href="/register">還沒有帳號？前往註冊</a>
        </div>

        <div className="hint">
          忘記密碼？之後會提供重設流程。
        </div>
      </form>
    </div>
  );
}
