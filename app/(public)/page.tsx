'use client';

import { useEffect, useState } from 'react';

type Me = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  isAdmin: boolean;
  vipTier: number;
  balance: number;
  bankBalance: number;
};

export default function LobbyPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [status, setStatus] = useState<'loading' | 'guest' | 'ok'>('loading');

  useEffect(() => {
    fetch('/api/users/me')
      .then(async (r) => (r.ok ? r.json() : null))
      .then((u) => {
        if (u) {
          setMe(u); setStatus('ok');
        } else {
          setStatus('guest');
        }
      })
      .catch(() => setStatus('guest'));
  }, []);

  if (status === 'loading') return <p>載入中…</p>;

  if (status === 'guest') {
    return (
      <main>
        <h2>大廳</h2>
        <p>你尚未登入。請前往 <a href="/login">登入</a> 或 <a href="/register">註冊</a>。</p>
      </main>
    );
  }

  return (
    <main>
      <h2>大廳</h2>
      <p>歡迎，{me?.displayName}！</p>
      <ul>
        <li>Email：{me?.email}</li>
        <li>VIP：{me?.vipTier}</li>
        <li>錢包：{me?.balance}</li>
        <li>銀行：{me?.bankBalance}</li>
      </ul>
      <form method="post" action="/api/auth/logout" style={{ marginTop: 16 }}>
        <button>登出</button>
      </form>
    </main>
  );
}
