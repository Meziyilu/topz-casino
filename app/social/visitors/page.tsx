'use client';
import '@/public/styles/social.css';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function VisitorsPage() {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    fetch('/api/social/visitors').then(r=>r.json()).then(d=>setItems(d.items||[]));
  }, []);
  return (
    <main className="s-card padded">
      <div className="s-card-title">最近訪客</div>
      <div className="visitors-grid s-mt-8">
        {items.map(v => (
          <article key={v.id} className="s-card padded">
            <div className="s-flex s-gap-10">
              <img src={v.viewer?.avatarUrl || '/avatar-default.png'} className="s-avatar" alt="" />
              <div className="s-col s-gap-4">
                <div style={{fontWeight:800}}>{v.viewer?.displayName || '玩家'}</div>
                <div className="s-card-subtitle">{new Date(v.visitedAt).toLocaleString()}</div>
                <div className="s-flex s-gap-8">
                  <Link href={`/profile?uid=${v.viewerId}`} className="s-btn sm ghost pill">看個人頁</Link>
                  <button className="s-btn sm pill">+ 追蹤</button>
                </div>
              </div>
            </div>
          </article>
        ))}
        {items.length === 0 && <div className="s-card-subtitle">暫無訪客</div>}
      </div>
    </main>
  );
}
