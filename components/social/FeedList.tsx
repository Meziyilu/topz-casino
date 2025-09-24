'use client';

import { useEffect, useState } from 'react';

type Post = {
  id: string;
  user: { id: string; displayName: string; avatarUrl?: string | null; vipTier?: number };
  body: string;
  imageUrl?: string | null;
  createdAt: string;
  liked?: boolean;
  likeCount?: number;
  commentCount?: number;
};

export default function FeedList({ scope }: { scope: 'following' | 'global' }) {
  const [items, setItems] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let abort = false;
    const load = async () => {
      setLoading(true);
      try {
        const url = new URL('/api/social/feed', window.location.origin);
        url.searchParams.set('scope', scope.toUpperCase()); // 後端若吃 FOLLOWING/GLOBAL
        const r = await fetch(url.toString(), { cache: 'no-store' });
        if (!r.ok) throw new Error('bad');
        const d = await r.json();
        if (!abort) setItems(d.items ?? []);
      } catch {
        if (!abort) setItems([]);
      } finally {
        if (!abort) setLoading(false);
      }
    };
    load();
    return () => { abort = true; };
  }, [scope]);

  const toggleLike = async (postId: string) => {
    try {
      // 先行更新 UI
      setItems(list => list.map(p => p.id===postId ? {
        ...p,
        liked: !p.liked,
        likeCount: Math.max(0, (p.likeCount ?? 0) + (p.liked ? -1 : 1)),
      } : p));

      await fetch(`/api/social/posts/${postId}/like`, {
        method: 'POST',
        headers: { 'content-type':'application/json' },
        body: JSON.stringify({ like: true }),
      });
    } catch {}
  };

  return (
    <div className="s-col s-gap-12">
      {loading && <div className="s-card-subtitle">載入中…</div>}
      {!loading && items.length === 0 && <div className="s-card-subtitle">目前沒有貼文</div>}

      {items.map((p) => (
        <article key={p.id} className="s-card padded post-card">
          <header className="s-flex s-gap-10" style={{alignItems:'center'}}>
            <img src={p.user.avatarUrl || '/avatar-default.png'} alt="" className="s-avatar" />
            <div className="s-col">
              <div style={{fontWeight:800}}>{p.user.displayName}</div>
              <div className="s-card-subtitle">{new Date(p.createdAt).toLocaleString()}</div>
            </div>
            <div style={{marginLeft:'auto'}}>
              <button className="s-icon-btn" aria-label="更多" data-sound>⋯</button>
            </div>
          </header>

          <div className="post-body s-mt-8">{p.body}</div>
          {p.imageUrl && <img className="post-media s-mt-8" src={p.imageUrl} alt="" />}

          <footer className="post-footer s-mt-12">
            <button
              className={`s-btn sm pill ${p.liked ? 'primary' : 'ghost'}`}
              onClick={() => toggleLike(p.id)}
              aria-pressed={!!p.liked}
              data-sound
            >
              讚 {p.likeCount ?? 0}
            </button>
            <a className="s-btn sm pill ghost" href={`/social/posts/${p.id}`} data-sound>
              留言 {p.commentCount ?? 0}
            </a>
            <button className="s-btn sm pill ghost" onClick={() => navigator.share?.({ text: p.body })} data-sound>
              分享
            </button>
          </footer>
        </article>
      ))}
    </div>
  );
}
