'use client';
import '@/public/styles/social.css';
import { useEffect, useState } from 'react';

export default function DMPage() {
  const [threads, setThreads] = useState<any[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<any[]>([]);
  const [text, setText] = useState('');

  useEffect(() => { fetch('/api/social/dm/threads').then(r=>r.json()).then(d=>setThreads(d.items||[])); }, []);
  useEffect(() => {
    if (!active) return;
    fetch(`/api/social/dm/threads/${active}`).then(r=>r.json()).then(d=>setMsgs(d.items||[]));
  }, [active]);

  return (
    <main className="dm-wrap">
      <aside className="s-card padded dm-thread-list">
        <div className="s-card-title">私訊</div>
        <div className="s-list s-mt-8">
          {threads.map(t => (
            <div key={t.id} className={`s-list-item ${active===t.id?'active':''}`} onClick={()=>setActive(t.id)}>
              <img src={t.peer?.avatarUrl || '/avatar-default.png'} className="s-avatar" alt="" />
              <div>
                <div style={{fontWeight:800}}>{t.peer?.displayName || '玩家'}</div>
                <div style={{color:'var(--s-text-mute)', fontSize:12}}>{t.lastSnippet}</div>
              </div>
              <div style={{color:'var(--s-text-mute)', fontSize:12}}>{t.lastAt && new Date(t.lastAt).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </aside>

      <section className="s-card padded dm-room">
        {active ? (
          <>
            <div className="dm-msgs s-card padded">
              <div className="s-col s-gap-8">
                {msgs.map(m => (
                  <div key={m.id} className="s-card padded" style={{background:'rgba(255,255,255,.03)'}}>
                    <div style={{fontWeight:700}}>{m.sender?.displayName || '系統'}</div>
                    <div className="s-card-subtitle">{new Date(m.createdAt).toLocaleString()}</div>
                    <div className="post-body">{m.body}</div>
                  </div>
                ))}
                {msgs.length===0 && <div className="s-card-subtitle">尚無訊息</div>}
              </div>
            </div>
            <div className="dm-inputbar">
              <input className="s-input" placeholder="輸入訊息…" value={text} onChange={(e)=>setText(e.target.value)} />
              <button className="s-btn primary" onClick={() => {/* 送出 API */}}>送出</button>
            </div>
          </>
        ) : (
          <div className="s-center" style={{minHeight:220, color:'var(--s-text-dim)'}}>選擇左側對話</div>
        )}
      </section>
    </main>
  );
}
