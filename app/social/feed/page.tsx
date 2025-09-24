// app/social/feed/page.tsx
"use client";

import { Suspense } from "react";
import FeedClientPage from "./page.client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function FeedPage() {
  return (
    <main className="social-feed">
      <header className="feed-head glass">
        <h1 className="title">社交動態</h1>
        <p className="sub">好友、全站的最新貼文</p>
      </header>

      {/* Feed 清單 + 發文框 */}
      <Suspense fallback={<div className="loading">載入中...</div>}>
        <FeedClientPage />
      </Suspense>

      <link rel="stylesheet" href="/styles/social.css" />
    </main>
  );
}
