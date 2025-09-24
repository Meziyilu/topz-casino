import { Suspense } from 'react';
import PostComposer from '@/components/social/PostComposer';
import FeedList from '@/components/social/FeedList';
import '@/public/styles/social.css';

export default function Page() {
  return (
    <main className="social-wrap">
      <section className="s-col s-gap-12">
        <h1 className="s-card-title">社交動態</h1>
        <PostComposer onPosted={() => { /* 若要強制 refresh，可透過 context 或 event bus 觸發 FeedList 重新載入 */ }} />
        <Suspense fallback={<div className="s-card padded">載入中…</div>}>
          <FeedList />
        </Suspense>
      </section>
    </main>
  );
}
