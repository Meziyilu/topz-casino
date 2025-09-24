'use client';

import '@/public/styles/social.css';
import { useEffect, useState } from 'react';
import FeedList from '@/components/social/FeedList';

export default function SocialFeedPage() {
  const [tab, setTab] = useState<'following'|'global'>('following');

  return (
    <main className="social-wrap">
      <header className="social-header">
        <nav className="social-tabs" role="tablist">
          <button
            className={`social-tab ${tab==='following'?'active':''}`}
            onClick={() => setTab('following')}
            role="tab"
            aria-selected={tab==='following'}
            data-sound
          >
            追蹤
          </button>
          <button
            className={`social-tab ${tab==='global'?'active':''}`}
            onClick={() => setTab('global')}
            role="tab"
            aria-selected={tab==='global'}
            data-sound
          >
            全站
          </button>
        </nav>

        <div className="s-flex s-gap-8">
          <button className="s-btn ghost sm pill" onClick={()=>location.reload()} data-sound>重新整理</button>
          <a className="s-btn primary sm pill" href="/social" data-sound>探索玩家</a>
        </div>
      </header>

      <section className="s-card padded">
        <div className="s-card-title">社交動態</div>
        <FeedList scope={tab} />
      </section>
    </main>
  );
}
