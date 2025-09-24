'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import '@/public/styles/social.css';

type Comment = {
  id: string;
  body: string;
  createdAt: string;
  user: { id: string; displayName: string; avatarUrl?: string | null };
};

export default function CommentPanel({
  postId,
  onClose,
}: {
  postId: string;
  onClose: () => void;
}) {
  const [items, setItems] = useState<Comment[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState('');
  const topGuardRef = useRef<HTMLDivElement | null>(null);

  const fetchMore = useCallback(async (initial = false) => {
    if (loading) return;
    setLoading(true);
    try {
      const url = new URL('/api/social/feed/comments', window.location.origin);
      url.searchParams.set('postId', postId);
      url.searchParams.set('limit', '20');
      if (!initial && cursor) url.searchParams.set('cursor', cursor);
      const r = await fetch(url.toString(), { cache: 'no-store' });
      const d = await r.json();
      if (r.ok) {
        setItems((prev) => (initial ? d.items : [...d.items, ...prev]));
        setCursor(d.nextCursor);
      }
    } finally {
      setLoading(false);
    }
  }, [cursor, loading, postId]);

  useEffect(() => { fetchMore(true); }, [fetchMore]);

  // 在最上方 sentinel，出現就抓更舊留言
  useEffect(() => {
    if (!topGuardRef.current) return;
    const guard = topGuardRef.current;
    const io = new IntersectionObserver((ents) => {
      ents.forEach((e) => {
        if (e.isIntersecting && cursor) fetchMore(false);
      });
    }, { rootMargin: '120px 0px' });
    io.observe(guard);
    return () => io.disconnect();
  }, [cursor, fetchMore]);

  async function send() {
    const t = text.trim();
    if (!t) return;
    setSending(true);
    try {
      const r = await fetch('/api/social/feed/comment', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ postId, body: t }),
      });
      if (r.ok) {
        setText('');
        // 重新抓一次最新（最簡單）
        await fetchMore(true);
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="comment-panel-overlay" role="dialog" aria-modal="true">
      <div className="comment-panel s-card">
        <div className="comment-head">
          <div className="s-card-title">留言</div>
          <button className="s-icon-btn" onClick={onClose} aria-label="關閉" data-sound>
            ✕
          </button>
        </div>

        <div className="comment-scroll">
          <div ref={topGuardRef} />
          {cursor && (
            <div className="s-center s-mt-8">
              <button className="s-btn sm ghost" onClick={() => fetchMore(false)} disabled={loading} data-sound>
                {loading ? '載入中…' : '載入更早留言'}
              </button>
            </div>
          )}

          {items.map((c) => (
            <div key={c.id} className="comment-item">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.user.avatarUrl || '/avatar-default.png'} alt="" className="s-avatar" />
              <div className="comment-body">
                <div className="comment-meta">
                  <b>{c.user.displayName}</b>
                  <span>{new Date(c.createdAt).toLocaleString()}</span>
                </div>
                <div className="comment-text">{c.body}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="comment-input">
          <input
            className="s-input"
            placeholder="寫下留言…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
          />
          <button className="s-btn primary" onClick={send} disabled={sending || !text.trim()} data-sound>
            送出
          </button>
        </div>
      </div>

      <style jsx global>{`
        .comment-panel-overlay{
          position:fixed; inset:0; background:rgba(0,0,0,.55);
          display:flex; align-items:flex-end; justify-content:center; z-index:130;
        }
        @media (min-width: 768px){
          .comment-panel-overlay{ align-items:center; }
        }
        .comment-panel{
          width:min(720px, 92vw);
          max-height: min(80vh, 760px);
          display:flex; flex-direction:column;
          border-radius:16px; padding:12px;
        }
        .comment-head{
          display:flex; align-items:center; justify-content:space-between;
          padding:4px 6px 8px;
        }
        .comment-scroll{
          overflow:auto; padding:6px 6px 0; margin: 4px 0 8px;
          border:1px solid var(--s-border); border-radius:12px; background:rgba(255,255,255,.04);
          max-height: calc(min(80vh, 760px) - 140px);
        }
        .comment-item{
          display:grid; grid-template-columns:40px 1fr; gap:10px; align-items:start;
          padding:10px; border-bottom:1px solid var(--s-border-weak);
        }
        .comment-item:last-child{ border-bottom:0; }
        .comment-body{ display:flex; flex-direction:column; gap:4px; }
        .comment-meta{ display:flex; gap:8px; font-size:12px; color:var(--s-text-mute); }
        .comment-text{ white-space:pre-wrap; line-height:1.6; }
        .comment-input{
          display:flex; gap:8px; align-items:center; padding:6px;
        }
      `}</style>
    </div>
  );
}
