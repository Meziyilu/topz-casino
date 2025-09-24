'use client';
import { useEffect, useState } from 'react';
import PostComposer from '@/components/social/PostComposer';
import FeedList from '@/components/social/FeedList';

export default function FeedPage() {
  const [scope, setScope] = useState<'following' | 'global'>('following');

  useEffect(() => {
    const saved = localStorage.getItem('feed_scope');
    if (saved === 'global' || saved === 'following') setScope(saved);
  }, []);
  useEffect(() => { localStorage.setItem('feed_scope', scope); }, [scope]);

  return (
    <main className="container mx-auto p-4 space-y-6">
      <header className="glass p-4 rounded-xl flex items-center justify-between">
        <h1 className="text-xl font-bold">社交動態</h1>
        <div className="flex gap-2">
          <button className={`btn ${scope==='following'?'primary':''}`} onClick={() => setScope('following')}>關注</button>
          <button className={`btn ${scope==='global'?'primary':''}`} onClick={() => setScope('global')}>全站</button>
        </div>
      </header>

      <PostComposer />
      <FeedList scope={scope} />
    </main>
  );
}
