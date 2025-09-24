'use client';

import '@/public/styles/social.css';
import { useState } from 'react';
import PostComposer from '@/components/social/PostComposer';
import FeedList from '@/components/social/FeedList';

export default function SocialFeedPage() {
  const [tab, setTab] = useState<'following'|'global'>('following');
  const [refresh, setRefresh] = useState(0);

  return (
    <main className="social-wrap">
      <header className="social-header">
        <nav className="social-tabs" role="tablist">
          <button className={`social-tab ${tab==='following'?'active':''}`} onClick={()=>setTab('following')} role="tab" aria-selected={tab==='following'} data-sound>追蹤</button>
          <button className={`social-tab ${tab==='global'?'active':''}`} onClick={()=>setTab('global')} role="tab" aria-selected={tab==='global'} data-sound>全站</button>
        </nav>
        <div className="s-flex s-gap-8">
          <button className="s-btn ghost sm pill" onClick={()=>setRefresh(x=>x+1)} data-sound>重新整理</button>
          <a className="s-btn primary sm pill" href="/social" data-sound>探索玩家</a>
        </div>
      </header>

      <PostComposer onPosted={() => setRefresh(x=>x+1)} />

      <section className="s-card padded s-mt-12">
        <div className="s-card-title">社交動態</div>
        <FeedList scope={tab} refreshToken={refresh} />
      </section>
    </main>
  );
}
