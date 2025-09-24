// app/social/feed/page.tsx
'use client';

export const dynamic = 'force-dynamic';
export const revalidate = 0; // ✅ 必須是數字或 false

import { useState } from 'react';
import FeedList from '@/components/social/FeedList';
import '@/public/styles/social.css';

export default function FeedPage() {
  const [refreshFlag, setRefreshFlag] = useState(0);

  return (
    <main className="social-wrap">
      <header className="social-header">
        <h1 className="s-card-title">社交動態</h1>
        <button
          className="s-btn primary"
          onClick={() => setRefreshFlag((v) => v + 1)}
        >
          重新整理
        </button>
      </header>

      {/* 貼文清單 (無限滾動) */}
      <section>
        <FeedList refreshFlag={refreshFlag} />
      </section>
    </main>
  );
}
