// app/social/dm/page.tsx
'use client';

export const dynamic = 'force-dynamic';
export const revalidate = 0; // ✅ 確保是數字或 false

import DmClient from './page.client';
import '@/public/styles/social.css';

export default function DmPage() {
  return (
    <main className="social-wrap">
      <DmClient />
    </main>
  );
}
