'use client';

import { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('demo@example.com');
  const [password, setPassword] = useState('P@ssw0rd!');
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) {
      location.href = '/';
    } else {
      const j = await res.json().catch(() => ({}));
      setMsg(j.error ?? '登入失敗');
    }
  }

  return (
    <main>
      <h2>登入</h2>
      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 8, maxWidth: 360 }}>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="密碼" type="password" />
        <button type="submit">登入</button>
        {msg && <p style={{ color: 'crimson' }}>{msg}</p>}
      </form>
      <p style={{ marginTop: 12 }}>
        忘記密碼？ <Forgot />
      </p>
    </main>
  );
}

function Forgot() {
  const [email, setEmail] = useState('');
  const [link, setLink] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function send() {
    setMsg(null); setLink(null);
    const res = await fetch('/api/auth/forgot', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const j = await res.json();
    if (res.ok) {
      setLink(j.resetUrl);
      setMsg('已寄發（此處先回連結供測試）');
    } else {
      setMsg(j.error ?? '失敗');
    }
  }

  return (
    <span>
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" style={{ width: 200 }} />
      <button onClick={send}>送出</button>
      {msg && <span> — {msg} {link && (<a href={link} style={{ marginLeft: 8 }}>立刻重設</a>)}</span>}
    </span>
  );
}
