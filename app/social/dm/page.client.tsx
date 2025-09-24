'use client';

import '@/public/styles/social.css';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';

type Msg = { id: string; senderId?: string | null; kind: 'TEXT'|'SYSTEM'; body: string; createdAt: string };

export default function ThreadClient() {
  const { threadId } = useParams<{ threadId: string }>();
  const [items, setItems] = useState<Msg[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');
  const scrollerRef = useRef<HTMLDivElement>(null);

  async function load(initial = false) {
    setLoading(true);
    try {
      const url = new URL('/api/social/dm/messages', window.location.origin);
      url.searchParams.set('threadId', String(threadId));
      if (!initial && cursor) url.searchParams.set('cursor', cursor);
      const r = await fetch(url.toString(), { cache: 'no-store' });
      const d = await r.json();
      if (r.ok) {
        setItems(prev => initial ? d.items : [...d.items, ...prev]); // 加前面
        setCursor(d.nextCursor);
        if (initial) requestAnimationFrame(() => scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight }));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(true); /* 初次載入 */ }, [threadId]);

  async function send() {
    const t = text.trim();
    if (!t) return;
    setText('');
    const r = await fetch('/api/social/dm/send', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ threadId, body: t }),
    });
    const d = await r.json();
    if (r.ok) {
      // 重新拉取最新訊息
      load(true);
    }
  }

  return (
    <main className="s-col s-gap-12">
      <div className="s-card-title">對話</div>

      <div className="dm-msgs" ref={scrollerRef}>
        <div className="s-col s-gap-8" style={{ padding: 10 }}>
          {cursor && (
            <button className="s-btn sm ghost" onClick={() => load(false)} disabled={loading} data-sound>
              {loading ? '載入中…' : '載入更早訊息'}
            </button>
          )}

          {items.map(m => (
            <div key={m.id} className="s-card" style={{ padding: 10 }}>
              <div style={{ fontSize: 12, opacity: .8 }}>{new Date(m.createdAt).toLocaleString()}</div>
              <div style={{ marginTop: 6 }}>{m.kind === 'SYSTEM' ? <em>[系統]</em> : null} {m.body}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="dm-inputbar">
        <input
          className="s-input"
          placeholder="輸入訊息…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
        />
        <button className="s-btn primary" onClick={send} data-sound>送出</button>
      </div>
    </main>
  );
}
