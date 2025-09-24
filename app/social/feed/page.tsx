// app/social/feed/page.tsx
'use client';

export const revalidate = 0; // ✅ 每次都重新拉取，不會有錯

import FeedClientPage from './page.client';

export default function FeedPage() {
  return <FeedClientPage />;
}
