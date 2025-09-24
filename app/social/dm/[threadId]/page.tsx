import { Suspense } from 'react';
import ThreadClient from './page.client';

export default function Page() {
  return (
    <Suspense fallback={<main className="s-card padded">載入中…</main>}>
      <ThreadClient />
    </Suspense>
  );
}
