// app/social/dm/page.tsx
import { Suspense } from 'react';
import DMPageClient from './page.client';

export default function Page() {
  return (
    <Suspense
      fallback={
        <main className="s-card padded">
          <div className="s-card-title">私訊</div>
          <div className="s-card-subtitle">載入中…</div>
        </main>
      }
    >
      <DMPageClient />
    </Suspense>
  );
}
