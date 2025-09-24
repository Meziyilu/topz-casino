// app/social/feed/page.tsx
'use client';

export const dynamic = 'force-dynamic';
// revalidate 要是數字或 false，不能是物件
export const revalidate = 0; // ✅ 每次請求都重新渲染

import FeedClientPage from './page.client';

export default function FeedPage() {
  return <FeedClientPage />;
}
