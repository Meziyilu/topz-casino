// app/social/dm/page.tsx
'use client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { Suspense } from 'react';
import DmIndexInner from './page.client'; // 這支是 client 子元件（下一段）

export default function DmIndexPage() {
  return (
    <Suspense fallback={<div className="s-card padded">載入中…</div>}>
      <DmIndexInner />
    </Suspense>
  );
}
