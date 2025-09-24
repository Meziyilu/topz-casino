// app/social/dm/page.tsx
'use client';

export const dynamic = 'force-dynamic';
export const revalidate = 0; // ✅ 正確設定

import Link from 'next/link';
import '@/public/styles/social.css';

export default function DMHomePage() {
  return (
    <main className="social-wrap">
      <header className="social-header">
        <h1 className="s-card-title">私訊</h1>
        <p className="s-card-subtitle">選擇一個會話開始聊天</p>
      </header>

      <section className="s-list">
        {/* 這裡將來會換成動態會話清單 */}
        <Link href="/social/dm/1" className="s-list-item">
          <img
            src="/avatars/demo1.png"
            alt="user"
            className="s-avatar"
          />
          <div>
            <div className="s-card-title">Alice</div>
            <div className="s-card-subtitle">嘿，你在嗎？</div>
          </div>
          <span className="s-card-subtitle">2 分鐘前</span>
        </Link>
      </section>
    </main>
  );
}
