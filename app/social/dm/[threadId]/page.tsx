'use client';

import '@/public/styles/social.css';
import { useEffect, useRef, useState } from 'react';

type Msg = {
  id: string;
  kind: 'TEXT'|'SYSTEM'|'PAYOUT_NOTICE'|'POPUP_NOTICE';
  body: string;
  createdAt: string;
  sender?: { id: string; displayName: string } | null;
};

export default function DMRoom({ params }: { params: { threadId: string } }) {
  const { threadId } = params;
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`/api/social/dm/threads/${threadId}`, { cache: 'no-store' });
      const d = await r.json();
      setMsgs(d.items || []);
      setTimeout(() => scrollerRef.current?.scrollTo({ top: 999999, behavior: 'smooth' }), 20);
    } catch {
      setMsgs([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [threadId]);

  const send = async () => {
    if (!text.trim()) return;
    const t = text;
    setText('');
    // 先推入畫面
    setMsgs(m => [...m, { id: 'temp-'+Date.now(), kind: 'TEXT', body: t, createdAt: new Date().toISOString(), sender: null }]);
    setTimeout(() => scrollerRef.current?.scrollTo({ top: 999999, behavior: 'smooth' }), 10);

    try {
      await fetch(`/api/social/dm/threads/${threadId}/send`, {
        method: 'POST',
        headers: { 'content-type':'application/json' },
        body: JSON.stringify({ body: t }),
      });
      // 再 reload 確認
      load();
    } catch {}
  };

  return (
    <main className="dm-wrap">
      <aside className="s-card padded">
        <a href="/social/dm" className="s-btn sm pill ghost" data-sound>← 回到列表</a>
      </aside>

      <section className="s-card padded dm-room">
        <div className="s-card-title">對話</div>
        <div ref={scrollerRef} className="dm-msgs s-card padded">
          <div className="s-col s-gap-8">
            {loading && <div className="s-card-subtitle">載入中…</div>}
            {!loading && msgs.map((m) => (
              <div key={m.id} className="s-card padded" style={{ background: 'rgba(255,255,255,.03)' }}>
                <div style={{ fontWeight: 700 }}>{m.sender?.displayName || (m.kind==='SYSTEM' ? '系統' : '我') }</div>
                <div className="s-card-subtitle">{new Date(m.createdAt).toLocaleString()}</div>
                <div className="post-body">{m.body}</div>
              </div>
            ))}
            {!loading && msgs.length === 0 && <div className="s-card-subtitle">尚無訊息</div>}
          </div>
        </div>
        <div className="dm-inputbar">
          <input className="s-input" placeholder="輸入訊息…" value={text} onChange={(e)=>setText(e.target.value)} onKeyDown={(e)=>{ if(e.key==='Enter') send(); }} />
          <button className="s-btn primary" onClick={send} data-sound>送出</button>
        </div>
      </section>
    </main>
  );
}
