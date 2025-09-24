'use client';

import '@/public/styles/social.css';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

type ThreadItem = {
  id: string;
  peer?: { id: string; displayName: string; avatarUrl?: string | null };
  lastSnippet?: string;
  lastAt?: string;
};

export default function DMPage() {
  const [threads, setThreads] = useState<ThreadItem[]>([]);
  const [loading, setLoading] = useState(false);

  const sp = useSearchParams();
  const router = useRouter();

  // 若帶 ?peer=USER_ID → 開啟或建立對話後導到 /social/dm/[id]
  useEffect(() => {
    const peer = sp.get('peer');
    if (!peer) return;
    (async () => {
      try {
        const r = await fetch('/api/social/dm/threads/start', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ peerId: peer }),
        });
        const d = await r.json();
        if (r.ok && d.id) {
          router.replace(`/social/dm/${d.id}`);
        }
      } catch {}
    })();
  }, [sp, router]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r = await fetch('/api/social/dm/threads', { cache: 'no-store' });
        const d = await r.json();
        setThreads(d.items || []);
      } catch {
        setThreads([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <main className="s-card padded">
      <div className="s-card-title">私訊</div>
      {loading && <div className="s-card-subtitle">載入中…</div>}
      {!loading && (
        <div className="s-list s-mt-12">
          {threads.map((t) => (
            <a
              key={t.id}
              href={`/social/dm/${t.id}`}
              className="s-list-item"
              data-sound
            >
              <img src={t.peer?.avatarUrl || '/avatar-default.png'} className="s-avatar" alt="" />
              <div>
                <div style={{fontWeight:800}}>{t.peer?.displayName || '玩家'}</div>
                <div className="s-card-subtitle">{t.lastSnippet || '（沒有訊息）'}</div>
              </div>
              <div className="s-card-subtitle">{t.lastAt && new Date(t.lastAt).toLocaleString()}</div>
            </a>
          ))}
          {threads.length === 0 && <div className="s-card-subtitle">目前沒有對話</div>}
        </div>
      )}
    </main>
  );
}
