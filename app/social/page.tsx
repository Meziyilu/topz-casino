'use client';
import '@/public/styles/social.css';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function SocialExplorePage() {
  const [items, setItems] = useState<any[]>([]);
  const [q, setQ] = useState('');

  useEffect(() => {
    const url = new URL('/api/social/search', window.location.origin);
    if (q) url.searchParams.set('q', q);
    fetch(url.toString()).then(r => r.json()).then(d => setItems(d.items ?? []));
  }, [q]);

  return (
    <main className="social-wrap">
      <aside className="s-card padded">
        <div className="s-card-title">探索玩家</div>
        <div className="social-search">
          <input className="s-input" placeholder="搜尋玩家 / 標籤" value={q} onChange={(e)=>setQ(e.target.value)} />
          <button className="s-btn primary">搜尋</button>
        </div>
        <div className="s-mt-12 s-card-subtitle">推薦關鍵字：high-roller、lucky、baccarat</div>
      </aside>

      <section className="s-card padded">
        <div className="s-card-title">搜尋結果</div>
        <div className="social-grid s-mt-8">
          {items.map(u => (
            <article key={u.id} className="s-card padded">
              <div className="s-flex s-gap-10">
                <img src={u.avatarUrl || '/avatar-default.png'} className="s-avatar" alt="" />
                <div className="s-col s-gap-4">
                  <div style={{fontWeight:800}}>{u.displayName}</div>
                  <div style={{color:'var(--s-text-dim)'}}>VIP {u.vipTier ?? 0}</div>
                  <div className="s-gap-8 s-flex">
                    <Link href={`/profile?uid=${u.id}`} className="s-btn sm ghost pill">看個人頁</Link>
                    <button className="s-btn sm pill">+ 追蹤</button>
                  </div>
                </div>
              </div>
            </article>
          ))}
          {items.length === 0 && <div className="s-card-subtitle">沒有結果</div>}
        </div>
      </section>
    </main>
  );
}
