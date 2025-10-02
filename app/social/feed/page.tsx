// app/social/feed/page.tsx
import { Suspense } from 'react';
import dynamic from 'next/dynamic';

const FeedClient = dynamic(() => import('./page.client'), {
  ssr: false,
  loading: () => (
    <div className="feed-card" style={{ color: '#fff' }}>
      <div className="title">載入中…</div>
      <div style={{ opacity: .8, marginTop: 6, fontSize: 14 }}>請稍候</div>
    </div>
  ),
});

export default function FeedPage() {
  return (
    <Suspense fallback={
      <div className="feed-card" style={{ color: '#fff' }}>
        <div className="title">載入中…</div>
        <div style={{ opacity: .8, marginTop: 6, fontSize: 14 }}>請稍候</div>
      </div>
    }>
      <FeedClient />
    </Suspense>
  );
}
