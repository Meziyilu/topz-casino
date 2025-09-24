// app/social/dm/page.tsx
export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import DmClient from './page.client';
import '@/public/styles/social.css';

export default function DmPage() {
  return (
    <main className="social-wrap">
      <Suspense fallback={<div className="s-card padded">載入中…</div>}>
        <DmClient />
      </Suspense>
    </main>
  );
}
