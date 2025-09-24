// app/social/feed/page.client.tsx
'use client';

import { useState, useCallback } from 'react';
import FeedList from '@/components/social/FeedList';
import PostComposer from '@/components/social/PostComposer';

export default function FeedClientPage() {
  const [refreshFlag, setRefreshFlag] = useState(0);

  // 手動觸發重新整理
  const handleRefresh = useCallback(() => {
    setRefreshFlag((f) => f + 1);
  }, []);

  return (
    <section className="feed-client">
      {/* 發文框 */}
      <PostComposer onPosted={handleRefresh} />

      {/* 動態清單 (無限滾動) */}
      <FeedList refreshFlag={refreshFlag} />

      {/* 手動 refresh 按鈕 */}
      <div className="actions">
        <button className="btn glass" onClick={handleRefresh}>
          🔄 重新整理
        </button>
      </div>
    </section>
  );
}
