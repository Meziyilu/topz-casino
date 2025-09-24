// app/social/feed/page.tsx
'use client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { useCallback, useEffect, useState } from 'react';
import NextDynamic from 'next/dynamic'; // ✅ 改名避免跟 export const dynamic 衝突
import '@/public/styles/social.css';

// 這兩個元件需要 client-side interactivity，所以用 NextDynamic lazy import
const PostComposer = NextDynamic(() => import('@/components/social/PostComposer'), { ssr: false });
const FeedList = NextDynamic(() => import('@/components/social/FeedList'), { ssr: false });

export default function SocialFeedPage() {
  const [refreshFlag, setRefreshFlag] = useState(0);

  // callback: 發文成功後觸發刷新
  const handlePosted = useCallback(() => {
    setRefreshFlag((f) => f + 1);
  }, []);

  // scroll-to-top 按鈕
  useEffect(() => {
    const btn = document.getElementById('scrollTopBtn');
    if (!btn) return;
    const onScroll = () => {
      if (window.scrollY > 200) btn.style.display = 'flex';
      else btn.style.display = 'none';
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <main className="social-wrap">
      <header className="social-header">
        <h1 className="s-card-title">社交動態</h1>
        <p className="s-card-subtitle">發表貼文、按讚、互動交流</p>
      </header>

      {/* 發文區 */}
      <section className="s-card padded">
        <PostComposer onPosted={handlePosted} />
      </section>

      {/* 貼文清單 (無限滾動) */}
      <section>
        <FeedList refreshFlag={refreshFlag} />
      </section>

      {/* scroll-to-top 按鈕 */}
      <button
        id="scrollTopBtn"
        className="s-icon-btn"
        style={{ position: 'fixed', bottom: '20px', right: '20px', display: 'none' }}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      >
        ↑
      </button>
    </main>
  );
}
