// app/profile/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Me = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string | null;
  vipTier: number;
  balance: number;
  bankBalance: number;
};

export default function ProfilePage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/api/users/me', { credentials: 'include' });
        if (!res.ok) {
          router.replace('/login?next=/profile');
          return;
        }
        const data = await res.json();
        if (alive) setMe(data.user ?? null);
      } catch {
        router.replace('/login?next=/profile');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [router]);

  if (loading) {
    return (
      <main style={{ minHeight: '100svh', display: 'grid', placeItems: 'center', color: '#b9c7d6' }}>
        載入中…
      </main>
    );
  }
  if (!me) return null;

  return (
    <main style={{ minHeight: '100svh', padding: 24, color: '#dfe6ff' }}>
      <h1 style={{ fontWeight: 800, letterSpacing: 2 }}>個人資料</h1>
      <div style={{
        marginTop: 16,
        maxWidth: 640,
        border: '1px solid rgba(255,255,255,.12)',
        borderRadius: 16,
        padding: 16,
        background: 'rgba(20,24,36,.46)',
        backdropFilter: 'blur(12px)'
      }}>
        <div>暱稱：{me.displayName}</div>
        <div>VIP：{me.vipTier}</div>
        <div>錢包：{me.balance}</div>
        <div>銀行：{me.bankBalance}</div>
      </div>
    </main>
  );
}
