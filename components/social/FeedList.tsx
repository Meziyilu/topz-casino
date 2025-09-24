'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useInfiniteScroll } from './useInfiniteScroll';
import dynamic from 'next/dynamic';

const CommentPanel = dynamic(() => import('./CommentPanel'), { ssr: false });

type Post = {
  id: string;
  body: string;
  createdAt: string;
  author: { id: string; displayName: string; avatarUrl?: string | null };
  media?: { url: string; kind: string }[];
  likes: number;
  comments: number;
  liked?: boolean;
};

export default function FeedList() {
  const [items, setItems] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [openPostId, setOpenPostId] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (loading) return;
    setLoading(true);
    try {
      const url = new URL('/api/social/feed/list', window.location.origin);
      url.searchParams.set('limit', '10');
      if (!refresh && cursor) url.searchParams.set('cursor', cursor);
      const r = await fetch(url.toString(), { cache: 'no-store' });
      const d = await r.json();
      if (r.ok) {
        setItems((prev) => (refresh ? d.items : [...prev, ...d.items]));
        setCursor(d.nextCursor);
      }
    } finally {
      setLoading(false);
    }
  }, [cursor, loading]);

  useEffect(() => { load(true); }, [load]);

  // 無限滾動 sentinel
  const { ref: bottomRef } = useInfiniteScroll(() => {
    if (!loading && cursor) load(false);
  }, { rootMargin: '600px 0px' });

  async function toggleLike(p: Post) {
    // 樂觀更新
    setItems(list => list.map(x => x.id === p.id ? { ...x, liked: !p.liked, likes: p.liked ? x.likes - 1 : x.likes + 1 } : x));
    const endpoint = p.liked ? '/api/social/feed/unlike' : '/api/social/feed/like';
    const r = await fetch(endpoint, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ postId: p.id }),
    });
    if (!r.ok) {
      // 還原
      setItems(list => list.map(x => x.id === p.id ? { ...x, liked: p.liked, likes: p.likes } : x));
    }
  }

  function openComments(postId: string) {
    setOpenPostId(postId);
  }

  function closeComments() {
    setOpenPostId(null);
  }

  const hasMore = useMemo(() => !!cursor, [cursor]);

  return (
    <>
      <div className="s-col s-gap-12">
        {items.map((p) => (
          <article key={p.id} className="s-card post-card">
            <div className="s-flex s-gap-10" style={{ alignItems: 'center' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.author.avatarUrl || '/avatar-default.png'} className="s-avatar" alt="" />
              <div>
                <div style={{ fontWeight: 800 }}>{p.author.displayName}</div>
                <div className="s-card-subtitle">{new Date(p.createdAt).toLocaleString()}</div>
              </div>
            </div>

            <div className="post-body s-mt-12">{p.body}</div>

            {p.media?.length ? (
              <div className="s-mt-12">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.media[0].url} className="post-media" alt="" />
              </div>
            ) : null}

            <footer className="post-footer s-mt-12">
              <button className="s-btn sm" onClick={() => toggleLike(p)} data-sound>
                {p.liked ? '已讚' : '按讚'} • {p.likes}
              </button>
              <button className="s-btn sm ghost" onClick={() => openComments(p.id)} data-sound>
                留言 • {p.comments}
              </button>
            </footer>
          </article>
        ))}

        {/* 無限滾動 sentinel */}
        <div ref={bottomRef} />
        <div className="s-center s-mt-12">
          <button className="s-btn" disabled={!hasMore || loading} onClick={() => load(false)} data-sound>
            {hasMore ? (loading ? '載入中…' : '載入更多') : '已到底'}
          </button>
        </div>
      </div>

      {openPostId && <CommentPanel postId={openPostId} onClose={closeComments} />}
    </>
  );
}
