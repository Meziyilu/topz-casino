// app/social/dm/page.tsx
'use client';

export const dynamic = 'force-dynamic'; // 即時渲染，不快取

import DmClient from './page.client';
import '@/public/styles/social.css';

export default function DmPage() {
  return (
    <main className="social-wrap">
      <DmClient />
    </main>
  );
}
