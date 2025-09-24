// app/social/feed/page.tsx
'use client';

// ✅ 僅保留這一行即可，避免被預產生
export const dynamic = 'force-dynamic';

// ⛔ 請不要在這裡宣告 export const revalidate = {...} 或任何物件
// ⛔ 也不要從別的檔案 re-export revalidate

import FeedClientPage from './page.client';

export default function FeedPage() {
  return <FeedClientPage />;
}
