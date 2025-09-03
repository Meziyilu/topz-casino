'use client';
import '../auth-theme.css';
import { useState } from 'react';

export default function LoginPage() {
  const [msg, setMsg] = useState<{ t: 'e' | 's'; m: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const body = Object.fromEntries(fd.entries());

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      body: new URLSearchParams(body as Record<string, string>),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setMsg({ t: 'e', m: data?.message ?? '登入失敗' });
      return;
    }
    setMsg({ t: 's', m: '登入成功，前往大廳…' });
    const next = new URLSearchParams(window.location.search).get('next') ?? '/';
    window.location.href = next;
  }

  return (
    <div className="auth-bg" style={{ display: 'grid', placeItems: 'center' }}>
      <form onSubmit={onSubmit} className="auth-card">
        <div className="brand">TOPZCASINO</div>
        <h1 className="auth-title">登入</h1>

        {msg && <div className={msg.t === 'e' ? 'auth-error' : 'auth-success'}>{msg.m}</div>}

        <input name="email" type="email" placeholder="Email" className="auth-input" required />
        <input name="password" type="password" placeholder="密碼" className="auth-input" required />

        <button className="auth-button" disabled={loading}>{loading ? '登入中…' : '登入'}</button>

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <a className="auth-link" href="/register">沒有帳號？註冊</a>
          <a className="auth-link" href="#" onClick={(e) => {
            e.preventDefault();
            const email = prompt('請輸入註冊 Email：');
            if (!email) return;
            fetch('/api/auth/forgot', {
              method: 'POST',
              headers: { 'content-type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({ email }),
            }).then(async r => {
              const d = await r.json();
              alert(d?.resetUrl ? `重設連結：${d.resetUrl}` : '若帳號存在，已寄送重設連結');
            });
          }}>忘記密碼</a>
        </div>
      </form>
    </div>
  );
}
