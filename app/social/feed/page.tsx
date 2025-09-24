// app/social/feed/page.tsx
"use client";

export const dynamic = "force-dynamic";
export const revalidate = 0; // ✅ 必須是 number 或 false，不要包成物件

import FeedPageClient from "./page.client";

export default function FeedPage() {
  return <FeedPageClient />;
}
