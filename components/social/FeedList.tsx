'use client';

import { useEffect, useState } from 'react';

type Scope = 'following' | 'global';

export default function FeedList({ scope }: { scope: Scope }) {
  const [items, setItems] = useState<any[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = async (reset = false) => {
    if (loading) return;
    if (!reset && done) return;
    setLoading(true);
    try {
      const url = new URL('/api/social/wall/feed', window.location.origin);
      url.searchParams.set('scope', scope);
      if (!reset && cursor) url.searchParams.set('cursor', cursor);
      const res = await fetch(url.toString());
      const j = await res.json();
      if (reset) {
        setItems(j.items || []);
      } else {
        setItems((prev) => [...prev, ...(j.items || [])]);
      }
      setCursor(j.nextCursor || null);
      setDone(!j.nextCursor);
    } finally {
      setLoading(false);
    }
  };

  // 初次與 scope 切換時載入
  useEffect(() => {
    setCursor(null);
    setDone(false);
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);

  // 發文後自動刷新
  useEffect(() => {
    const onCreated = () => load(true);
    window.addEventListener('post:created', onCreated);
    return () => window.removeEventListener('post:created', onCreated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);

  return (
    <section className="space-y-3">
      {items.map((p) => (
        <article key={p.id} className="glass p-4 rounded-xl space-y-2">
          <header className="flex items-center gap-3">
            <img
              src={p.user?.avatarUrl || '/avatar-default.png'}
              className="w-10 h-10 rounded-full object-cover"
              alt=""
            />
            <div className="flex-1">
              <div className="font-semibold">{p.user?.displayName || 'User'}</div>
              <div className="text-xs opacity-70">{new Date(p.createdAt).toLocaleString()}</div>
            </div>
          </header>
          <div className="whitespace-pre-wrap">{p.body}</div>
          {p.imageUrl && (
            <img
              src={p.imageUrl}
              alt=""
              className="w-full rounded-lg object-cover max-h-[420px]"
            />
          )}
          {Array.isArray(p.medias) && p.medias.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {p.medias.map((m: any) => (
                <img key={m.id} src={m.url} alt="" className="rounded-lg object-cover" />
              ))}
            </div>
          )}
          <footer className="text-sm opacity-80">
            💬 {p._count?.comments ?? 0}　❤️ {p._count?.likes ?? 0}
          </footer>
        </article>
      ))}

      {!done && (
        <div className="flex justify-center">
          <button className="btn" onClick={() => load(false)} disabled={loading}>
            {loading ? '載入中…' : '載入更多'}
          </button>
        </div>
      )}
      {done && items.length === 0 && (
        <div className="text-center opacity-70">尚無貼文</div>
      )}
    </section>
  );
}
