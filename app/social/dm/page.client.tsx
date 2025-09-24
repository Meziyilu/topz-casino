// app/social/dm/page.client.tsx
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import '@/public/styles/social.css';

type Thread = {
  id: string;
  lastMessageAt?: string | null;
  peer?: { id: string; displayName: string; avatarUrl?: string | null };
};

export default function DmIndexInner() {
  const sp = useSearchParams(); // ✅ 已放在 Suspense 裡使用
  const q = sp.get('q') || '';
  const [items, setItems] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/social/dm/threads?${q ? `q=${encodeURIComponent(q)}` : ''}`, {
          cache: 'no-store',
        });
        const d = await r.json();
        setItems(d.items || []);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [q]);

  return (
    <main className="social-wrap">
      <section className="s-card padded">
        <h1 className="s-card-title">私訊</h1>
        <p className="s-card-subtitle">與其他玩家一對一聊天</p>

        <div className="s-list s-mt-12">
          {loading && <div className="s-muted">載入中…</div>}
          {!loading &&
            items.map((t) => (
              <Link key={t.id} href={`/social/dm/${t.id}`} className="s-list-item">
                <img
                  className="s-avatar"
                  src={t.peer?.avatarUrl || '/avatar-default.png'}
                  alt=""
                  loading="lazy"
                />
                <div>
                  <div style={{ fontWeight: 800 }}>{t.peer?.displayName || '玩家'}</div>
                  <div className="s-card-subtitle">最後訊息：{t.lastMessageAt || '-'}</div>
                </div>
                <div aria-hidden>→</div>
              </Link>
            ))}
          {!loading && !items.length && <div className="s-muted">目前沒有會話</div>}
        </div>
      </section>
    </main>
  );
}
